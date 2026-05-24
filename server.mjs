import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const CACHE_DIR = path.join(__dirname, "cache");
const PLACES_CACHE_FILE = path.join(CACHE_DIR, "places-cache.json");
const PRODUCTS_CACHE_FILE = path.join(CACHE_DIR, "products-cache.json");
const PORT = Number(process.env.PORT || 4173);
const APP_USER_AGENT = "RighthandAI/0.2 (local storefront intelligence; contact: local)";

// Apify caches must be declared before loadDiskCaches() runs so the loader can
// populate them. Functions further down the file still use the same identifiers.
const APIFY_PLACES_CACHE = new Map();
const APIFY_PRODUCTS_CACHE = new Map();
const COMMONS_IMAGE_CACHE = new Map();

await loadDotEnv();
await loadDiskCaches();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const DEFAULT_PROFILE = {
  businessName: "Dhrumil's SF Shop",
  businessType: "restaurant",
  address: "412 Mission St, San Francisco, CA",
  city: "San Francisco",
  state: "CA",
  lat: 37.7909,
  lon: -122.3971,
  radiusMeters: 1200
};

const DELEGATED_ACTION_AUDIT = [];
const DELEGATED_AGENT_INBOX = [];
const DEMO_OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL || "dhrumildeepakshah@gmail.com";
const DEMO_CUSTOMER_EMAIL = process.env.DEMO_CUSTOMER_EMAIL || process.env.WARDEN_GMAIL_DEMO_TO || "dhrumil789789@gmail.com";
const SCALEKIT_DEMO_STORES = [
  {
    id: "righthand-store-1",
    name: "Store 1 - Mission Street",
    externalId: "righthand-store-1",
    address: "412 Mission St, San Francisco, CA"
  },
  {
    id: "righthand-store-2",
    name: "Store 2 - Weekend Pop-up",
    externalId: "righthand-store-2",
    address: "San Francisco, CA"
  }
];
const SCALEKIT_DEMO_PERMISSIONS = {
  owner: [
    "store:intel_read",
    "store:settings_write",
    "agent:action_execute",
    "agent:action_approve",
    "marketing:campaign_draft",
    "marketing:campaign_publish",
    "customer:segment_write",
    "customer:message_send",
    "supplier:order_draft",
    "supplier:order_purchase",
    "team:task_assign",
    "audit:trail_read"
  ],
  manager: [
    "store:intel_read",
    "agent:action_execute",
    "marketing:campaign_draft",
    "customer:segment_write",
    "supplier:order_draft",
    "team:task_assign",
    "audit:trail_read"
  ],
  associate: [
    "store:intel_read",
    "agent:action_request",
    "store:notes_write",
    "team:message_create"
  ]
};
const DEFAULT_SCALEKIT_STORE = SCALEKIT_DEMO_STORES[0];

const DEMO_AGENT_USERS = [
  {
    id: "owner-ava",
    name: "Ava Patel",
    email: DEMO_OWNER_EMAIL,
    role: "owner",
    title: "Owner",
    tenantId: DEFAULT_SCALEKIT_STORE.externalId,
    tenantName: DEFAULT_SCALEKIT_STORE.name,
    scalekitOrganizationExternalId: DEFAULT_SCALEKIT_STORE.externalId,
    scalekitRole: "owner",
    scalekitPermissions: SCALEKIT_DEMO_PERMISSIONS.owner,
    scopes: [
      "storefront.hours.write",
      "marketing.campaign.write",
      "customer.segment.write",
      "customer.message.write",
      "customer.credit.write",
      "suppliers.order.write",
      "compliance.task.write"
    ]
  },
  {
    id: "manager-ben",
    name: "Ben Lee",
    email: "ben@missionops.local",
    role: "manager",
    title: "Store manager",
    tenantId: DEFAULT_SCALEKIT_STORE.externalId,
    tenantName: DEFAULT_SCALEKIT_STORE.name,
    scalekitOrganizationExternalId: DEFAULT_SCALEKIT_STORE.externalId,
    scalekitRole: "manager",
    scalekitPermissions: SCALEKIT_DEMO_PERMISSIONS.manager,
    scopes: [
      "marketing.campaign.write",
      "customer.segment.write",
      "customer.message.write",
      "compliance.task.write",
      "suppliers.order.draft"
    ]
  },
  {
    id: "associate-mia",
    name: "Mia Garcia",
    email: "mia@missionops.local",
    role: "associate",
    title: "Front counter associate",
    tenantId: DEFAULT_SCALEKIT_STORE.externalId,
    tenantName: DEFAULT_SCALEKIT_STORE.name,
    scalekitOrganizationExternalId: DEFAULT_SCALEKIT_STORE.externalId,
    scalekitRole: "associate",
    scalekitPermissions: SCALEKIT_DEMO_PERMISSIONS.associate,
    scopes: [
      "notes.write",
      "marketing.campaign.draft"
    ]
  }
];

const SCALEKIT_RBAC_CACHE = {
  at: 0,
  users: null,
  organizations: null,
  roles: null,
  source: "local-demo",
  error: ""
};
const SCALEKIT_RBAC_TTL_MS = 60 * 1000;

const DELEGATED_SCOPE_TO_SCALEKIT_PERMISSION = {
  "storefront.hours.write": "store:settings_write",
  "marketing.campaign.write": "marketing:campaign_draft",
  "marketing.campaign.draft": "marketing:campaign_draft",
  "customer.segment.write": "customer:segment_write",
  "customer.message.write": "marketing:campaign_draft",
  "customer.credit.write": "customer:message_send",
  "suppliers.order.write": "supplier:order_purchase",
  "suppliers.order.draft": "supplier:order_draft",
  "compliance.task.write": "team:task_assign",
  "notes.write": "store:notes_write",
  "team.message.create": "team:message_create"
};

const SCALEKIT_DEMO_USER_BINDINGS = [
  { id: "owner-ava", role: "owner", title: "Owner", name: "Ava Patel", email: DEMO_OWNER_EMAIL },
  {
    id: "manager-ben",
    role: "manager",
    title: "Store manager",
    name: "Ben Lee",
    email: process.env.SCALEKIT_DEMO_MANAGER_EMAIL || process.env.SCALEKIT_DEMO_SECOND_EMAIL || DEMO_CUSTOMER_EMAIL
  },
  {
    id: "associate-mia",
    role: "associate",
    title: "Front counter associate",
    name: "Mia Garcia",
    email: process.env.SCALEKIT_DEMO_ASSOCIATE_EMAIL || "dhrumil789789+associate@gmail.com"
  }
];

const SOURCE_CATALOG = [
  {
    id: "open-meteo-weather",
    name: "Open-Meteo Weather",
    auth: "No key",
    use: "Forecast, precipitation, wind, temperature",
    url: "https://open-meteo.com/en/docs"
  },
  {
    id: "open-meteo-air",
    name: "Open-Meteo Air Quality",
    auth: "No key for non-commercial/basic use",
    use: "US AQI, PM2.5, ozone and pollutant forecasts",
    url: "https://open-meteo.com/en/docs/air-quality-api"
  },
  {
    id: "nws-alerts",
    name: "National Weather Service Alerts",
    auth: "No key",
    use: "Active weather watches, warnings and advisories by point",
    url: "https://www.weather.gov/documentation/services-web-alerts"
  },
  {
    id: "datasf-sfpd",
    name: "DataSF SFPD Incidents",
    auth: "No key; optional Socrata app token",
    use: "Recent police incident reports near the shop",
    url: "https://data.sfgov.org/Public-Safety/Police-Department-Incident-Reports-2018-to-Present/wg3w-h783"
  },
  {
    id: "datasf-311",
    name: "DataSF 311 Cases",
    auth: "No key; optional Socrata app token",
    use: "Street, sanitation, graffiti, encampment and infrastructure cases",
    url: "https://data.sfgov.org/d/vw6y-z8j6"
  },
  {
    id: "osm-overpass",
    name: "OpenStreetMap Overpass",
    auth: "No key",
    use: "City-wide competitor, corridor, amenity and business-density scan",
    url: "https://overpass-api.de/"
  },
  {
    id: "gdelt",
    name: "GDELT DOC 2.1",
    auth: "No key",
    use: "Live news and web article search by city/business terms",
    url: "https://www.gdeltproject.org/"
  },
  {
    id: "city-safety-news",
    name: "City Safety News Scan",
    auth: "No key",
    use: "Crime, police, fire, outage and public-safety monitoring when city incident APIs are unavailable",
    url: "https://news.google.com/"
  },
  {
    id: "city-infrastructure-news",
    name: "City Infrastructure Scan",
    auth: "No key",
    use: "Construction, road closure, utility, transit and public works monitoring",
    url: "https://news.google.com/"
  },
  {
    id: "city-economy-news",
    name: "City Economy Scan",
    auth: "No key",
    use: "Housing, openings, closures, foot-traffic, campus and local demand drivers",
    url: "https://news.google.com/"
  },
  {
    id: "regulatory-news",
    name: "Official and Regulatory Watch",
    auth: "No key",
    use: "Localized laws, permits, inspections, wage, tax and storefront policy monitoring",
    url: "https://www.sf.gov/topics--business"
  },
  {
    id: "local-events",
    name: "Local Event Watch",
    auth: "No key",
    use: "Large events and demand drivers that can affect staffing, inventory and safety",
    url: "https://news.google.com/"
  },
  {
    id: "usgs-earthquakes",
    name: "USGS Earthquake GeoJSON",
    auth: "No key",
    use: "Recent regional earthquake feed",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/"
  },
  {
    id: "nasa-eonet",
    name: "NASA EONET",
    auth: "No key",
    use: "Natural events such as wildfires, severe storms and volcanoes",
    url: "https://eonet.gsfc.nasa.gov/docs/v3"
  },
];

const RESTOCK_PROVIDERS = [
  { id: "amazon", name: "Amazon Business", domain: "amazon.com", color: "#f4a742", url: (q) => `https://www.amazon.com/s?${new URLSearchParams({ k: q })}` },
  { id: "walmart", name: "Walmart", domain: "walmart.com", color: "#4a8fd8", url: (q) => `https://www.walmart.com/search?${new URLSearchParams({ q })}` },
  { id: "target", name: "Target", domain: "target.com", color: "#e05f5f", url: (q) => `https://www.target.com/s?${new URLSearchParams({ searchTerm: q })}` },
  { id: "costco", name: "Costco", domain: "costco.com", color: "#5878b8", url: (q) => `https://www.costco.com/CatalogSearch?${new URLSearchParams({ keyword: q })}` },
  { id: "ikea", name: "IKEA", domain: "ikea.com", color: "#d6a03c", url: (q) => `https://www.ikea.com/us/en/search/?${new URLSearchParams({ q })}` },
  { id: "staples", name: "Staples", domain: "staples.com", color: "#c95b4f", url: (q) => `https://www.staples.com/${encodeURIComponent(q)}/directory_${encodeURIComponent(q)}` },
  { id: "uline", name: "Uline", domain: "uline.com", color: "#7d91b3", url: (q) => `https://www.uline.com/BL_1170/Search?${new URLSearchParams({ keywords: q })}` },
  { id: "webstaurant", name: "WebstaurantStore", domain: "webstaurantstore.com", color: "#36c28f", url: (q) => `https://www.webstaurantstore.com/search/${encodeURIComponent(q)}.html` },
  { id: "homedepot", name: "Home Depot", domain: "homedepot.com", color: "#d66f35", url: (q) => `https://www.homedepot.com/s/${encodeURIComponent(q)}` }
];

const PRELOADED_PRODUCT_IMAGE_SETS = [
  {
    id: "chairs",
    aliases: ["chair", "chairs", "seating", "stool", "stools", "recliner", "recliner chair", "lounge chair"],
    images: [
      {
        title: "Folding Chair Lifetime",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Folding_Chair_Lifetime.jpg/250px-Folding_Chair_Lifetime.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Folding_Chair_Lifetime.jpg"
      },
      {
        title: "FB14 Lounge Chair",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/FB14-Lounge-Chair_by_Cees_Braakman_for_Pastoe%2C_Utrecht%2C_NL.jpg/250px-FB14-Lounge-Chair_by_Cees_Braakman_for_Pastoe%2C_Utrecht%2C_NL.jpg",
        url: "https://commons.wikimedia.org/wiki/File:FB14-Lounge-Chair_by_Cees_Braakman_for_Pastoe,_Utrecht,_NL.jpg"
      },
      {
        title: "BKF Chair",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/BKF_Chair.jpg/250px-BKF_Chair.jpg",
        url: "https://commons.wikimedia.org/wiki/File:BKF_Chair.jpg"
      }
    ]
  },
  {
    id: "tables",
    aliases: ["table", "tables", "desk", "desks", "counter", "counters", "patio table"],
    images: [
      {
        title: "Table banquette",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Table-banquette_by_Annie_Tribel_1968_-_Design_Museum_Brussels_Belgium.jpg/250px-Table-banquette_by_Annie_Tribel_1968_-_Design_Museum_Brussels_Belgium.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Table-banquette_by_Annie_Tribel_1968_-_Design_Museum_Brussels_Belgium.jpg"
      },
      {
        title: "Chef's table products",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Master_Kong_Chef%27s_Table_Products.jpg/250px-Master_Kong_Chef%27s_Table_Products.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Master_Kong_Chef%27s_Table_Products.jpg"
      }
    ]
  },
  {
    id: "utensils",
    aliases: ["utensil", "utensils", "cutlery", "flatware", "spoon", "spoons", "fork", "forks", "knife", "knives"],
    images: [
      {
        title: "Vintage chromesteel cutlery",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Vintage_starker_kid_gold-coloured_chromesteel_cutlery%2C_Blokker_Winschoten_%282018%29_02.jpg/250px-Vintage_starker_kid_gold-coloured_chromesteel_cutlery%2C_Blokker_Winschoten_%282018%29_02.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Vintage_starker_kid_gold-coloured_chromesteel_cutlery,_Blokker_Winschoten_(2018)_02.jpg"
      },
      {
        title: "IKEA Tillagd cutlery",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Tillagd%2C_IKEA_Delft_%282022%29_02.jpg/250px-Tillagd%2C_IKEA_Delft_%282022%29_02.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Tillagd,_IKEA_Delft_(2022)_02.jpg"
      }
    ]
  },
  {
    id: "jacks",
    aliases: ["jack", "jacks", "car jack", "floor jack", "hydraulic jack", "jack stand", "jack stands"],
    images: [
      {
        title: "Hydraulic jack",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hydraulic_jack.jpg/250px-Hydraulic_jack.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Hydraulic_jack.jpg"
      },
      {
        title: "Sealey hydraulic jack and jack stand",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Sealey_hydraulic_jack_and_jack_stand.jpg/250px-Sealey_hydraulic_jack_and_jack_stand.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Sealey_hydraulic_jack_and_jack_stand.jpg"
      }
    ]
  },
  {
    id: "car-parts",
    aliases: ["car part", "car parts", "auto part", "auto parts", "automotive part", "automotive parts", "battery", "brake", "bumper", "filter"],
    images: [
      {
        title: "Powerstart automotive battery",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Powerstart_Automotive_Battery.jpeg/250px-Powerstart_Automotive_Battery.jpeg",
        url: "https://commons.wikimedia.org/wiki/File:Powerstart_Automotive_Battery.jpeg"
      },
      {
        title: "Bumper to Bumper Auto Parts",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Bumper_to_Bumper_Auto_Parts%2C_Bristol%2C_Florida.jpg/250px-Bumper_to_Bumper_Auto_Parts%2C_Bristol%2C_Florida.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Bumper_to_Bumper_Auto_Parts,_Bristol,_Florida.jpg"
      }
    ]
  },
  {
    id: "oil",
    aliases: ["oil", "motor oil", "engine oil", "automotive oil", "synthetic oil"],
    images: [
      {
        title: "Motor oil bottles",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Motor_oil_bottles_variousbrands.jpg/250px-Motor_oil_bottles_variousbrands.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Motor_oil_bottles_variousbrands.jpg"
      },
      {
        title: "Pennzoil oil bottles",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Pennzoil_oil_bottles.jpg/250px-Pennzoil_oil_bottles.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Pennzoil_oil_bottles.jpg"
      }
    ]
  },
  {
    id: "shoes",
    aliases: ["shoe", "shoes", "sneaker", "sneakers", "footwear"],
    images: [
      {
        title: "Pair of Camper shoes",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Pair_of_Camper_shoes_%282%29.jpg/250px-Pair_of_Camper_shoes_%282%29.jpg",
        url: "https://commons.wikimedia.org/wiki/File:Pair_of_Camper_shoes_(2).jpg"
      },
      {
        title: "On Clouds running shoes",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/On_Clouds_running_shoes_with_Swiss_flag.jpg/250px-On_Clouds_running_shoes_with_Swiss_flag.jpg",
        url: "https://commons.wikimedia.org/wiki/File:On_Clouds_running_shoes_with_Swiss_flag.jpg"
      }
    ]
  }
];

const RESTOCK_CATALOG = [
  {
    id: "utensils",
    terms: ["spoon", "spoons", "fork", "forks", "knife", "knives", "cutlery", "flatware", "utensil", "utensils", "straw", "straws"],
    businessFit: ["restaurant", "food stall", "coffee shop", "grocery"],
    search: "restaurant disposable spoons bulk",
    options: [
      { provider: "webstaurant", title: "Choice heavyweight plastic teaspoons case", price: 28.99, pack: "1000 count", rating: 4.8, reviews: 1900, salesSignal: "Foodservice bulk seller", stock: "Case quantity", fit: "Lowest unit cost disposable spoons", eta: "Commercial shipping varies" },
      { provider: "amazon", title: "Heavyweight disposable plastic spoons", price: 22.99, pack: "600 count", rating: 4.7, reviews: 5800, salesSignal: "High marketplace review volume", stock: "Multiple sellers", fit: "Fast emergency restock", eta: "Fast shipping varies" },
      { provider: "costco", title: "Bulk plastic cutlery variety pack", price: 17.99, pack: "360 count", rating: 4.6, reviews: 1300, salesSignal: "Bulk club demand", stock: "Membership pricing", fit: "Spoons plus backup forks/knives", eta: "Warehouse / delivery varies" },
      { provider: "walmart", title: "Heavy duty disposable spoons pack", price: 6.48, pack: "48 count", rating: 4.5, reviews: 2100, salesSignal: "Strong pickup reviews", stock: "Often pickup eligible", fit: "Same-day shortage coverage", eta: "Pickup / delivery varies" },
      { provider: "target", title: "Heavyweight disposable spoons", price: 5.49, pack: "48 count", rating: 4.4, reviews: 900, salesSignal: "Useful local pickup signal", stock: "Pickup may be available", fit: "Small front-counter gap", eta: "Pickup / delivery varies" }
    ]
  },
  {
    id: "chairs",
    terms: ["chair", "chairs", "seating", "stool", "stools", "dining chair", "restaurant chair"],
    businessFit: ["restaurant", "coffee shop", "food stall", "retail", "salon"],
    search: "stackable commercial dining chairs",
    options: [
      { provider: "ikea", title: "Stackable easy-clean dining chair", price: 29.99, pack: "1 chair", rating: 4.5, reviews: 2450, salesSignal: "High review volume", stock: "Good for fast replacement", fit: "Low-cost customer seating", eta: "Store pickup / delivery varies" },
      { provider: "amazon", title: "Commercial metal stack chair set", price: 119.99, pack: "4 chairs", rating: 4.4, reviews: 3800, salesSignal: "Large marketplace volume", stock: "Usually multiple sellers", fit: "Quick bulk restock", eta: "Fast shipping varies" },
      { provider: "walmart", title: "Stackable resin dining chair set", price: 94.00, pack: "4 chairs", rating: 4.3, reviews: 1200, salesSignal: "Strong mass retail reviews", stock: "Often pickup eligible", fit: "Budget dine-in refresh", eta: "Pickup / delivery varies" },
      { provider: "costco", title: "Commercial-grade folding chair pack", price: 79.99, pack: "4 chairs", rating: 4.6, reviews: 980, salesSignal: "Bulk buyer signal", stock: "Best with membership", fit: "Overflow seating and events", eta: "Warehouse / delivery varies" },
      { provider: "target", title: "Modern dining chair pair", price: 110.00, pack: "2 chairs", rating: 4.2, reviews: 850, salesSignal: "Good style reviews", stock: "Pickup may be available", fit: "Front-of-house look upgrade", eta: "Pickup / delivery varies" }
    ]
  },
  {
    id: "takeout",
    terms: ["container", "containers", "takeout", "to go", "cups", "paper cup", "lids", "bowls", "clamshell"],
    businessFit: ["restaurant", "food stall", "coffee shop", "grocery"],
    search: "restaurant takeout containers lids bulk",
    options: [
      { provider: "webstaurant", title: "Microwavable takeout container case", price: 38.49, pack: "150 count", rating: 4.7, reviews: 3200, salesSignal: "Restaurant supply volume", stock: "Bulk case", fit: "Delivery and pickup packaging", eta: "Commercial shipping varies" },
      { provider: "amazon", title: "Compostable clamshell containers", price: 31.99, pack: "100 count", rating: 4.5, reviews: 7200, salesSignal: "Very high review volume", stock: "Multiple sellers", fit: "Quick emergency restock", eta: "Fast shipping varies" },
      { provider: "costco", title: "Foodservice container bulk pack", price: 46.99, pack: "bulk case", rating: 4.6, reviews: 900, salesSignal: "Bulk buyer signal", stock: "Membership pricing", fit: "Lower unit cost", eta: "Warehouse / delivery varies" },
      { provider: "walmart", title: "Disposable food containers with lids", price: 24.98, pack: "50 count", rating: 4.3, reviews: 1600, salesSignal: "Strong pickup signal", stock: "Pickup may be available", fit: "Same-day gap coverage", eta: "Pickup / delivery varies" },
      { provider: "target", title: "Party food storage containers", price: 18.00, pack: "30-50 count", rating: 4.2, reviews: 750, salesSignal: "Light retail volume", stock: "Useful for small shortages", fit: "Small emergency restock", eta: "Pickup / delivery varies" }
    ]
  },
  {
    id: "cleaning",
    terms: ["cleaner", "cleaning", "sanitizer", "disinfectant", "soap", "paper towel", "trash bag", "gloves", "mop"],
    businessFit: ["restaurant", "grocery", "retail", "salon", "barbershop", "laundromat", "daycare", "auto repair"],
    search: "business cleaning supplies bulk",
    options: [
      { provider: "uline", title: "Commercial cleaning supply case", price: 62.00, pack: "bulk case", rating: 4.6, reviews: 1150, salesSignal: "Business supply signal", stock: "Bulk replenishment", fit: "Back-of-house sanitation", eta: "Business shipping varies" },
      { provider: "costco", title: "Disinfecting wipes and paper goods pack", price: 39.99, pack: "bulk pack", rating: 4.7, reviews: 2200, salesSignal: "High bulk demand", stock: "Membership pricing", fit: "Weekly cleaning restock", eta: "Warehouse / delivery varies" },
      { provider: "amazon", title: "Nitrile gloves and sanitizer bundle", price: 27.99, pack: "case / bundle", rating: 4.5, reviews: 9400, salesSignal: "Very high review volume", stock: "Multiple sellers", fit: "Fast emergency replacement", eta: "Fast shipping varies" },
      { provider: "walmart", title: "Commercial trash bags and cleaners", price: 22.98, pack: "multi-pack", rating: 4.4, reviews: 2600, salesSignal: "Strong store pickup signal", stock: "Pickup may be available", fit: "Same-day shortage", eta: "Pickup / delivery varies" },
      { provider: "target", title: "Surface cleaner and paper towel bundle", price: 19.99, pack: "bundle", rating: 4.3, reviews: 1800, salesSignal: "Good retail signal", stock: "Pickup may be available", fit: "Small operational gap", eta: "Pickup / delivery varies" }
    ]
  },
  {
    id: "office-pos",
    terms: ["receipt", "receipt paper", "printer", "pos", "tablet", "label", "labels", "paper", "ink", "office"],
    businessFit: ["restaurant", "retail", "grocery", "salon", "barbershop", "pharmacy", "auto repair"],
    search: "receipt paper labels point of sale supplies",
    options: [
      { provider: "staples", title: "Thermal receipt paper rolls case", price: 29.99, pack: "50 rolls", rating: 4.6, reviews: 2100, salesSignal: "Office supply volume", stock: "Business pickup signal", fit: "POS continuity", eta: "Pickup / delivery varies" },
      { provider: "amazon", title: "Thermal receipt paper bulk rolls", price: 25.99, pack: "50 rolls", rating: 4.7, reviews: 8400, salesSignal: "Very high review volume", stock: "Multiple sellers", fit: "Fast POS restock", eta: "Fast shipping varies" },
      { provider: "walmart", title: "Receipt paper and labels pack", price: 18.98, pack: "multi-pack", rating: 4.4, reviews: 1100, salesSignal: "Store pickup signal", stock: "Pickup may be available", fit: "Same-day gap coverage", eta: "Pickup / delivery varies" },
      { provider: "target", title: "Label tape and office supply pack", price: 16.99, pack: "small pack", rating: 4.3, reviews: 680, salesSignal: "Light retail volume", stock: "Useful for small shortage", fit: "Front counter supplies", eta: "Pickup / delivery varies" },
      { provider: "costco", title: "Office supply bulk bundle", price: 44.99, pack: "bulk bundle", rating: 4.5, reviews: 920, salesSignal: "Bulk buyer signal", stock: "Membership pricing", fit: "Monthly office restock", eta: "Warehouse / delivery varies" }
    ]
  },
  {
    id: "shelving",
    terms: ["shelf", "shelves", "shelving", "rack", "storage", "bin", "bins", "organizer"],
    businessFit: ["restaurant", "retail", "grocery", "pharmacy", "laundromat", "auto repair"],
    search: "commercial shelving storage racks",
    options: [
      { provider: "homedepot", title: "Heavy-duty storage shelving unit", price: 89.00, pack: "1 rack", rating: 4.6, reviews: 5200, salesSignal: "High project volume", stock: "Pickup likely", fit: "Backroom storage", eta: "Pickup / delivery varies" },
      { provider: "uline", title: "Commercial wire shelving rack", price: 145.00, pack: "1 rack", rating: 4.6, reviews: 1600, salesSignal: "Business supply signal", stock: "Commercial grade", fit: "Inventory organization", eta: "Business shipping varies" },
      { provider: "amazon", title: "NSF-style wire shelving unit", price: 72.99, pack: "1 rack", rating: 4.5, reviews: 11800, salesSignal: "Very high review volume", stock: "Multiple sellers", fit: "Fast storage expansion", eta: "Fast shipping varies" },
      { provider: "walmart", title: "5-tier storage shelf", price: 59.98, pack: "1 rack", rating: 4.4, reviews: 3100, salesSignal: "Strong retail volume", stock: "Pickup may be available", fit: "Low-cost backroom shelf", eta: "Pickup / delivery varies" },
      { provider: "ikea", title: "Utility shelving and bin setup", price: 49.99, pack: "1 unit", rating: 4.5, reviews: 1900, salesSignal: "Good design reviews", stock: "Store pickup varies", fit: "Light storage / front area", eta: "Store pickup / delivery varies" }
    ]
  }
];

export async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "warden",
        env: redactEnvStatus(),
        now: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/sources") {
      return sendJson(res, 200, { sources: SOURCE_CATALOG });
    }

    if (url.pathname === "/api/agent/session") {
      return sendJson(res, 200, await buildAgentSession(url.searchParams));
    }

    if (url.pathname === "/api/agent/actions") {
      const body = req.method === "POST" ? await readJsonBody(req) : {};
      return sendJson(res, 200, await buildAgentActions(body || {}, url.searchParams));
    }

    if (url.pathname === "/api/agent/execute") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
      const body = await readJsonBody(req);
      const payload = await executeDelegatedAction(body || {});
      return sendJson(res, payload.ok ? 200 : 400, payload);
    }

    if (url.pathname === "/api/agent/autonomy") {
      const body = req.method === "POST" ? await readJsonBody(req) : {};
      return sendJson(res, 200, await buildAutonomousAgentPlan(body || {}, url.searchParams));
    }

    if (url.pathname === "/api/agent/autonomy/run") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
      const body = await readJsonBody(req);
      const payload = await executeAutonomousActions(body || {});
      return sendJson(res, payload.ok ? 200 : 400, payload);
    }

    if (url.pathname === "/api/agent/inbox") {
      const user = await resolveAgentUser(url.searchParams.get("userId") || url.searchParams.get("as") || "owner-ava");
      return sendJson(res, 200, {
        ok: true,
        user,
        inbox: agentInboxForUser(user),
        audit: agentAuditForUser(user)
      });
    }

    if (url.pathname === "/api/agent/message") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
      const body = await readJsonBody(req);
      const payload = await createDelegatedMessage(body || {});
      return sendJson(res, payload.ok ? 200 : 400, payload);
    }

    if (url.pathname === "/api/agent/approve") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
      const body = await readJsonBody(req);
      const payload = await approveDelegatedRequest(body || {});
      return sendJson(res, payload.ok ? 200 : 400, payload);
    }

    if (url.pathname === "/api/agent/audit") {
      const tenantId = url.searchParams.get("tenantId");
      const audit = tenantId
        ? DELEGATED_ACTION_AUDIT.filter((event) => event.tenantId === tenantId)
        : DELEGATED_ACTION_AUDIT;
      return sendJson(res, 200, { ok: true, audit: audit.slice(0, 40) });
    }

    if (url.pathname === "/api/intel") {
      const profile = profileFromSearch(url.searchParams);
      const payload = await buildIntel(profile);
      return sendJson(res, 200, payload);
    }

    if (url.pathname === "/api/restock") {
      const profile = profileFromSearch(url.searchParams);
      const payload = await buildRestockComparison(profile, url.searchParams);
      return sendJson(res, 200, payload);
    }

    if (url.pathname === "/api/chat") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
      const body = await readJsonBody(req);
      const payload = await handleChat(body || {});
      return sendJson(res, payload.ok ? 200 : payload.fallback ? 503 : 500, payload);
    }

    if (url.pathname === "/api/translate") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
      const body = await readJsonBody(req);
      const payload = await handleTranslate(body || {});
      return sendJson(res, 200, payload);
    }

    if (url.pathname === "/api/apify/run") {
      const actorId = url.searchParams.get("actorId");
      if (!actorId) {
        return sendJson(res, 400, { error: "Missing actorId. Example: apify/website-content-crawler" });
      }
      const input = Object.fromEntries(url.searchParams.entries());
      delete input.actorId;
      const payload = await runApifyActor(actorId, input);
      return sendJson(res, payload.ok ? 200 : 502, payload);
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Internal server error",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

if (isMainModule()) {
  const server = createServer(handleRequest);
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Righthand AI running at http://127.0.0.1:${PORT}`);
  });
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env is optional for the public-data demo.
  }
}

// Disk-backed Apify cache so warm scans survive server restarts. The cache
// is written to ./cache/{places,products}-cache.json after every successful
// Apify call and replayed on startup.
async function loadDiskCaches() {
  await loadOneDiskCache(PLACES_CACHE_FILE, "places");
  await loadOneDiskCache(PRODUCTS_CACHE_FILE, "products");
}

async function loadOneDiskCache(file, label) {
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw);
    const target = label === "places" ? "APIFY_PLACES_CACHE" : "APIFY_PRODUCTS_CACHE";
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (target === "APIFY_PLACES_CACHE") {
        APIFY_PLACES_CACHE.set(key, value);
      } else {
        APIFY_PRODUCTS_CACHE.set(key, value);
      }
      count += 1;
    }
    if (count) console.log(`Loaded ${count} ${label} cache entries from ${path.basename(file)}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Failed to load ${label} cache: ${error.message}`);
    }
  }
}

let placesPersistPending = false;
let productsPersistPending = false;
function persistPlacesCache() {
  if (placesPersistPending) return;
  placesPersistPending = true;
  setTimeout(() => {
    placesPersistPending = false;
    flushCacheToDisk(PLACES_CACHE_FILE, APIFY_PLACES_CACHE).catch((error) => {
      console.warn(`Failed to persist places cache: ${error.message}`);
    });
  }, 200);
}
function persistProductsCache() {
  if (productsPersistPending) return;
  productsPersistPending = true;
  setTimeout(() => {
    productsPersistPending = false;
    flushCacheToDisk(PRODUCTS_CACHE_FILE, APIFY_PRODUCTS_CACHE).catch((error) => {
      console.warn(`Failed to persist products cache: ${error.message}`);
    });
  }, 200);
}
async function flushCacheToDisk(file, cacheMap) {
  await mkdir(CACHE_DIR, { recursive: true });
  const obj = Object.fromEntries(cacheMap);
  await writeFile(file, JSON.stringify(obj, null, 2));
}

function redactEnvStatus() {
  return {
    apify: Boolean(process.env.APIFY_TOKEN),
    socrata: Boolean(process.env.SOCRATA_APP_TOKEN),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    scalekit: Boolean(process.env.SCALEKIT_ENVIRONMENT_URL && process.env.SCALEKIT_CLIENT_ID && process.env.SCALEKIT_CLIENT_SECRET),
    entire: Boolean(process.env.ENTIRE_API_KEY || process.env.ENTIRE_API_URL)
  };
}

async function readJsonBody(req) {
  return await new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try { resolve(JSON.parse(text)); } catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

async function buildAgentSession(params = new URLSearchParams()) {
  const users = await resolveAgentUsers();
  const selectedUser = selectAgentUser(users, params.get("userId") || params.get("as") || "owner-ava");
  return {
    ok: true,
    selectedUser,
    users,
    integrations: agentIntegrationStatus(),
    scalekitSaas: scalekitSaasModel(selectedUser, users),
    message: "Apify supplies market evidence, Scalekit gates who the agent can act as, Entire receives the user-scoped business action, and Righthand AI records the audit trail.",
    judgingHooks: [
      "Same recommendation behaves differently for owner, manager, and associate.",
      "Every execution is scoped to tenant, user, role, and action permission.",
      "Blocked actions still create an audit event for accountability."
    ]
  };
}

function scalekitSaasModel(user = DEMO_AGENT_USERS[0], users = DEMO_AGENT_USERS) {
  const live = SCALEKIT_RBAC_CACHE.source === "scalekit-live";
  const organizations = (SCALEKIT_RBAC_CACHE.organizations?.length ? SCALEKIT_RBAC_CACHE.organizations : SCALEKIT_DEMO_STORES)
    .map((store) => ({
      id: store.id,
      displayName: store.displayName || store.display_name || store.name,
      externalId: store.externalId || store.external_id || store.id,
      address: store.address || store.metadata?.address || ""
    }));
  const roleEntries = SCALEKIT_RBAC_CACHE.roles?.length
    ? SCALEKIT_RBAC_CACHE.roles
    : Object.entries(SCALEKIT_DEMO_PERMISSIONS).map(([name, permissions]) => ({ name, permissions }));
  return {
    source: live ? "scalekit-live" : "local-fallback",
    error: live ? "" : SCALEKIT_RBAC_CACHE.error,
    activeOrganizationExternalId: user.scalekitOrganizationExternalId || DEFAULT_SCALEKIT_STORE.externalId,
    activeRole: user.scalekitRole || user.role,
    activePermissions: user.scalekitPermissions || [],
    organizations,
    roles: roleEntries.map((role) => ({
      name: role.name,
      displayName: role.displayName || role.display_name || humanizeKey(role.name),
      permissions: role.permissions || SCALEKIT_DEMO_PERMISSIONS[role.name] || []
    })),
    users: users.map((item) => ({
      id: item.id,
      email: item.email,
      role: item.scalekitRole || item.role,
      organizationExternalId: item.scalekitOrganizationExternalId || item.tenantId,
      permissionCount: (item.scalekitPermissions || []).length,
      source: item.scalekitSource || "local-fallback"
    }))
  };
}

async function buildAgentActions(body = {}, params = new URLSearchParams()) {
  const user = await resolveAgentUser(body.userId || params.get("userId") || "owner-ava");
  const store = storeFromPayload(body.store) || profileFromSearch(params);
  const intel = body.intel || null;
  const actions = recommendedDelegatedActions(store, intel).map((action) => ({
    ...action,
    policy: evaluateDelegatedPolicy(user, action)
  }));
  return {
    ok: true,
    user,
    tenant: { id: user.tenantId, name: user.tenantName },
    integrations: agentIntegrationStatus(),
    actions,
    audit: agentAuditForUser(user, 12),
    inbox: agentInboxForUser(user)
  };
}

async function executeDelegatedAction(body = {}) {
  const user = await resolveAgentUser(body.userId || body.user?.id || "owner-ava");
  const store = storeFromPayload(body.store) || DEFAULT_PROFILE;
  const action = normalizeDelegatedAction(body.action, store, body.intel);
  const policy = evaluateDelegatedPolicy(user, action);
  const auditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    at: new Date().toISOString(),
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    storeName: store.businessName || "Unnamed storefront",
    actionId: action.id,
    actionTitle: action.title,
    target: action.target,
    decision: policy.decision,
    reason: policy.reason,
    evidence: action.evidence,
    executed: policy.decision === "allowed"
  };

  if (policy.decision !== "allowed") {
    const inboxItem = policy.decision === "needs_approval"
      ? createApprovalRequest({ user, store, action, policy, auditEvent })
      : null;
    DELEGATED_ACTION_AUDIT.unshift(auditEvent);
    return {
      ok: true,
      executed: false,
      policy,
      auditEvent,
      inboxItem,
      message: policy.decision === "needs_approval"
        ? `${user.name} sent this to the owner for approval.`
        : `${user.name} is not allowed to execute this action for this tenant.`
    };
  }

  const scalekit = await executeScalekitDelegation({ user, store, action });
  const entire = await executeEntireAction({ user, store, action, scalekit });
  auditEvent.scalekit = scalekit.summary;
  auditEvent.entire = entire.summary;
  auditEvent.externalRef = entire.referenceId;
  DELEGATED_ACTION_AUDIT.unshift(auditEvent);
  return {
    ok: true,
    executed: true,
    policy,
    scalekit,
    entire,
    auditEvent,
    message: `${action.title} executed as ${user.name} (${user.role}) for ${store.businessName || "this storefront"}.`
  };
}

async function buildAutonomousAgentPlan(body = {}, params = new URLSearchParams()) {
  const user = await resolveAgentUser(body.userId || params.get("userId") || "owner-ava");
  const store = storeFromPayload(body.store) || profileFromSearch(params);
  const intel = body.intel || null;
  const automationContext = body.automationContext || body.emailContext || "";
  const customers = demoCustomersForStore(store);
  const signals = customerMemorySignals(customers, store, intel);
  const finance = demoFinancialSnapshot(store, customers, signals);
  const visibleSignals = user.role === "owner" ? signals : { ...signals, customerEmail: "" };
  const actions = recommendedAutonomousActions({ user, store, intel, customers, signals, finance, automationContext })
    .filter((action) => !action.visibilityRoles?.length || action.visibilityRoles.includes(user.role))
    .map((action) => user.role === "owner" ? action : redactAutonomousAction(action));
  const recipientGuardrail = user.role === "owner"
    ? `The only automatic customer send is the approved Gmail recipient ${DEMO_CUSTOMER_EMAIL}.`
    : "Only the owner can see or send approved customer email.";
  return {
    ok: true,
    user,
    tenant: { id: user.tenantId, name: user.tenantName },
    customers: user.role === "owner" ? customers : [],
    signals: visibleSignals,
    finance: user.role === "owner" ? finance : null,
    actions,
    guardrails: [
      "Only internal Entire.io tasks, segments, teammate messages, and one approved Gmail recipient run automatically.",
      recipientGuardrail,
      "No public posts, refunds, purchases, broad customer sends, or hour changes run without owner approval.",
      "Every automatic move is logged into the shared tenant report trail."
    ],
    audit: agentAuditForUser(user, 12),
    inbox: agentInboxForUser(user)
  };
}

async function executeAutonomousActions(body = {}) {
  const user = await resolveAgentUser(body.userId || body.user?.id || "owner-ava");
  const store = storeFromPayload(body.store) || DEFAULT_PROFILE;
  const plan = await buildAutonomousAgentPlan({
    userId: user.id,
    store,
    intel: body.intel,
    automationContext: body.automationContext || body.emailContext || ""
  });
  const liveConnectors = body.liveConnectors === true || body.liveConnectors === "true";
  const now = new Date().toISOString();
  const results = [];
  const auditEvents = [];

  for (const action of plan.actions) {
    const scalekit = {
      mode: user.scalekitSource === "scalekit-live" ? "scalekit-rbac" : "tenant-guardrail",
      summary: `Autonomous safe action scoped to tenant ${user.tenantId}; delegated by ${user.email}; role=${user.scalekitRole || user.role}; permissions=${(user.scalekitPermissions || []).slice(0, 4).join(", ")}`
    };
    const entire = await executeEntireAction({ user, store, action, scalekit });
    const gmail = liveConnectors
      ? await executeGmailAutomation({
          user,
          store,
          action,
          demoRecipient: body.gmailDemoRecipient || body.demoRecipient,
          delivery: body.gmailDelivery || body.delivery
        })
      : null;
    const auditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      at: new Date().toISOString(),
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      userId: "warden-autopilot",
      userName: "Righthand AI Autopilot",
      userRole: "autonomous_agent",
      delegatedByUserId: user.id,
      delegatedByUserName: user.name,
      storeName: store.businessName || "Unnamed storefront",
      actionId: action.id,
      actionTitle: action.title,
      target: action.target,
      decision: "auto_executed",
      reason: action.guardrail,
      evidence: action.evidence,
      executed: true,
      scalekit: scalekit.summary,
      entire: entire.summary,
      gmail: gmail?.summary,
      externalRef: entire.referenceId
    };
    DELEGATED_ACTION_AUDIT.unshift(auditEvent);
    auditEvents.push(auditEvent);
    results.push({ action, scalekit, entire, gmail, auditEvent });

    if (action.inboxRole) {
      const inboxAction = action.inboxRole === "owner" ? action : redactAutonomousAction(action);
      DELEGATED_AGENT_INBOX.unshift({
        id: `auto-msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        type: "autonomous_message",
        status: "open",
        at: now,
        updatedAt: now,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        fromUserId: "warden-autopilot",
        fromUserName: "Righthand AI Autopilot",
        fromRole: "autonomous_agent",
        toRole: action.inboxRole,
        title: inboxAction.title,
        body: `${inboxAction.summary} Evidence: ${inboxAction.evidence}`,
        action: inboxAction,
        store,
        target: inboxAction.target
      });
    }
  }

  const gmailSent = results.some((result) => result.gmail?.delivery === "send");
  const gmailTouched = results.some((result) => result.gmail);
  return {
    ok: true,
    executed: true,
    count: results.length,
    results,
    auditEvents,
    inbox: agentInboxForUser(user),
    audit: agentAuditForUser(user, 20),
    liveConnectors,
    message: liveConnectors
      ? (gmailSent
        ? `Righthand AI created ${results.length} automations and sent the approved Gmail through Scalekit.`
        : gmailTouched
          ? `Righthand AI created ${results.length} automations and prepared Scalekit Gmail messages.`
          : `Righthand AI created ${results.length} automations with live connector guardrails.`)
      : `Righthand AI safely created ${results.length} internal records, tasks, segments, or teammate messages.`
  };
}

function demoCustomersForStore(store) {
  const type = labelForType(store.businessType || "retail").toLowerCase();
  const regularItem = type.includes("restaurant") ? "veggie burrito bowl" : type.includes("coffee") ? "oat latte" : "weekly essentials";
  const addOn = type.includes("restaurant") ? "extra salsa" : type.includes("coffee") ? "banana bread" : "same-day pickup";
  return [
    {
      id: "cust-regular-primary",
      name: "Dhrumil Regular",
      email: DEMO_CUSTOMER_EMAIL,
      tags: ["regular", "high-intent", "opted-in"],
      lastVisitDaysAgo: 18,
      visits90d: 11,
      lifetimeValue: 684,
      favoriteItems: [regularItem, addOn],
      lastOrder: { item: regularItem, amount: 24.5, channel: "pickup", at: "18 days ago" },
      risk: "lapsed regular"
    },
    {
      id: "cust-local-lunch",
      name: "Mission Office Buyer",
      email: DEMO_CUSTOMER_EMAIL,
      tags: ["weekday", "pickup", "premium", "company"],
      lastVisitDaysAgo: 5,
      visits90d: 9,
      lifetimeValue: 1220,
      favoriteItems: [regularItem, "bulk lunch order"],
      lastOrder: { item: "bulk lunch order", amount: 186.25, channel: "pickup", at: "5 days ago" },
      risk: "active"
    },
    {
      id: "cust-family-pack",
      name: "Weekend Family Order",
      email: "",
      tags: ["weekend", "larger basket"],
      lastVisitDaysAgo: 31,
      visits90d: 4,
      lifetimeValue: 428,
      favoriteItems: [regularItem, "family pack"],
      lastOrder: { item: "family pack", amount: 58.75, channel: "delivery", at: "31 days ago" },
      risk: "at risk"
    }
  ];
}

function customerMemorySignals(customers, store, intel) {
  const regulars = customers.filter((customer) => customer.tags.includes("regular") || customer.visits90d >= 7);
  const lapsed = customers.filter((customer) => customer.lastVisitDaysAgo >= 14);
  const favoriteCounts = new Map();
  for (const customer of customers) {
    for (const item of customer.favoriteItems || []) {
      favoriteCounts.set(item, (favoriteCounts.get(item) || 0) + 1);
    }
  }
  const topItem = [...favoriteCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "best seller";
  const market = intel?.marketIntelligence || {};
  const peak = market.busyHeatmap?.peakDay
    ? `${market.busyHeatmap.peakDay} ${formatHour12(market.busyHeatmap.peakHour)}`
    : "the next peak window";
  return {
    regularCount: regulars.length,
    lapsedCount: lapsed.length,
    topItem,
    peak,
    customerEmail: DEMO_CUSTOMER_EMAIL,
    estimatedRecoveryValue: Math.round(lapsed.reduce((sum, customer) => sum + (customer.lifetimeValue || 0), 0) * 0.18),
    storeType: labelForType(store.businessType || "retail")
  };
}

function demoFinancialSnapshot(store, customers, signals) {
  const avgTicket = moneyNumber(store.avgTicket) || 22;
  const visits = customers.reduce((sum, customer) => sum + (customer.visits90d || 0), 0);
  const monthlyOrders = Math.max(420, Math.round(visits * 18));
  const revenue = Math.round(monthlyOrders * avgTicket);
  const cogs = Math.round(revenue * 0.34);
  const labor = Math.round(revenue * 0.27);
  const rent = Math.round(revenue * 0.11);
  const fees = Math.round(revenue * 0.06);
  const netProfit = revenue - cogs - labor - rent - fees;
  const margin = Math.round((netProfit / revenue) * 100);
  const cashBufferDays = Math.max(9, Math.round((netProfit + revenue * 0.18) / Math.max(420, (labor + rent + cogs) / 30)));
  return {
    month: "May",
    revenue,
    cogs,
    labor,
    rent,
    fees,
    netProfit,
    margin,
    cashBufferDays,
    topProfitItem: signals.topItem,
    leak: "delivery fees rose faster than pickup sales"
  };
}

function moneyNumber(value) {
  const text = String(value || "").replace(/,/g, "");
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function professionalEventRequestBody({ store, signals, finance, automationContext }) {
  const ownerContext = String(automationContext || "").replace(/\s+/g, " ").trim();
  const item = signals.storeType.toLowerCase().includes("restaurant")
    ? "takeout containers, bags, napkins, and best-selling ingredients"
    : "best-selling inventory and checkout supplies";
  const contextLine = ownerContext
    ? `Owner editable context: ${ownerContext}`
    : `Expected need: additional ${item} before ${signals.peak}.`;
  return [
    "Hello,",
    "",
    `Please confirm availability, lead time, and bulk pricing for additional goods for ${store.businessName || "our store"}.`,
    contextLine,
    `Primary demand item: ${signals.topItem}.`,
    finance?.margin ? `Current planning target: protect the ${finance.margin}% margin while avoiding stockouts.` : "",
    "",
    "Please treat this as a prepared request only. Fulfillment should begin only after owner approval.",
    "",
    "Thank you."
  ].filter(Boolean).join("\n");
}

function recommendedAutonomousActions({ user, store, intel, customers, signals, finance, automationContext = "" }) {
  const customer = customers[0];
  const premium = customers.find((item) => item.tags?.includes("premium")) || customers[1] || customer;
  const city = store.city || "your city";
  const apifyEvidence = intel?.marketProvider === "apify"
    ? `Apify market scan plus customer/order records`
    : `Customer memory plus ${intel?.marketPlaces?.length || 0} local business records`;
  const couponCode = `${String(store.businessName || "RIGHTHAND").replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase() || "RH"}10`;
  const eventRequestBody = professionalEventRequestBody({ store, signals, finance, automationContext });
  return [
    autonomousAction({
      id: "auto-regular-segment",
      title: "Auto-build regular-customer recovery segment",
      target: "Entire.io Customer Segment Draft",
      summary: `Grouped ${signals.lapsedCount} lapsed regulars around ${signals.topItem}; no message was sent.`,
      guardrail: "Segment draft only; no customer contact and no public action.",
      evidence: `${customer.email} last ordered ${customer.lastOrder.item} ${customer.lastOrder.at}`,
      visibilityRoles: ["owner"],
      inboxRole: "",
      payload: {
        segmentName: `${store.businessName || "Store"} lapsed regulars`,
        customerIds: customers.filter((item) => item.lastVisitDaysAgo >= 14).map((item) => item.id),
        customerEmail: customer.email,
        reason: `Recover regulars before ${signals.peak}`
      }
    }),
    autonomousAction({
      id: "auto-manager-prep-checklist",
      title: "Auto-create manager prep checklist",
      target: "Entire.io Task Checklist",
      summary: `Created a prep list for ${signals.peak}: stock bags, prep ${signals.topItem}, confirm staffing.`,
      guardrail: "Internal checklist only; manager can edit or dismiss it.",
      evidence: apifyEvidence,
      inboxRole: "manager",
      payload: {
        checklist: ["Stock bags", `Prep ${signals.topItem}`, "Confirm staffing", "Check sidewalk signage"],
        due: signals.peak,
        assigneeRole: "manager"
      }
    }),
    autonomousAction({
      id: "auto-customer-comeback-record",
      title: "Auto-prepare regular comeback campaign",
      target: "Entire.io Campaign Record",
      summary: `Prepared a comeback note for regulars who buy ${signals.topItem}; owner still controls sending.`,
      guardrail: "Campaign record only; no email, SMS, coupon, or publish action.",
      evidence: `${signals.regularCount} regular customers in the customer file`,
      visibilityRoles: ["owner"],
      inboxRole: "",
      payload: {
        to: customer.email,
        subject: `${store.businessName || "Your store"} saved your usual`,
        body: `Invite ${customer.name} back for ${signals.topItem} before ${signals.peak}.`,
        ownerApprovalRequired: true
      }
    }),
    autonomousAction({
      id: "auto-send-churn-save-email",
      title: "Auto-send weekly comeback coupon",
      target: "Gmail Send via Scalekit",
      summary: `Sends the weekly offer to the approved customer with coupon ${couponCode}.`,
      guardrail: "Approved recipient only, one send per run, no SMS or public post.",
      evidence: `${customer.email} has not visited for ${customer.lastVisitDaysAgo} days after ${customer.visits90d} recent visits`,
      visibilityRoles: ["owner"],
      inboxRole: "",
      payload: {
        to: customer.email,
        customerName: customer.name,
        subject: `${store.businessName || "Your store"} weekly offer: ${couponCode}`,
        body: `We saved your usual ${signals.topItem}. Come back this week and show coupon ${couponCode} for an owner-approved thank-you offer.`,
        couponCode,
        cadence: "weekly",
        consent: "opted_in",
        frequencyCapDays: 30,
        delivery: "send",
        sentAutomatically: true
      }
    }),
    autonomousAction({
      id: "auto-premium-bulk-outreach",
      title: "Auto-prepare premium bulk outreach",
      target: "Gmail Draft via Scalekit",
      summary: `Prepared a premium-customer message for bulk ${signals.topItem} orders and company catering.`,
      guardrail: "Draft only; owner edits pricing, discount and recipient list before sending.",
      evidence: `${premium.name} has ${premium.visits90d} recent visits and a $${premium.lifetimeValue} lifetime value`,
      visibilityRoles: ["owner"],
      inboxRole: "",
      payload: {
        to: premium.email || DEMO_CUSTOMER_EMAIL,
        customerName: premium.name,
        subject: `${store.businessName || "Your store"} bulk order availability`,
        body: [
          `Hi ${firstNameFromCustomer(premium.name) || "there"},`,
          "",
          `We can reserve bulk ${signals.topItem} orders for teams, offices, and family events this week.`,
          "Reply with the approximate headcount and pickup window, and the owner will confirm the best available discount before anything is booked.",
          "",
          `Suggested owner code: BULK${couponCode.replace(/\D/g, "") || "10"}`
        ].join("\n"),
        delivery: "draft",
        segment: "premium and company buyers"
      }
    }),
    autonomousAction({
      id: "auto-event-supplier-request",
      title: "Auto-prepare event inventory request",
      target: "Gmail Draft via Scalekit",
      summary: `Prepared an editable request for extra goods before ${signals.peak}.`,
      guardrail: "Draft only; supplier request is not sent or purchased until the owner approves.",
      evidence: `${signals.peak} demand window plus ${signals.topItem} customer history`,
      visibilityRoles: ["owner"],
      inboxRole: "manager",
      payload: {
        to: DEMO_CUSTOMER_EMAIL,
        subject: `${store.businessName || "Store"} additional goods request`,
        body: eventRequestBody,
        delivery: "draft",
        editable: true
      }
    }),
    autonomousAction({
      id: "auto-monthly-earnings-report",
      title: "Auto-close monthly earnings report",
      target: "Entire.io Owner Finance Report",
      summary: `Closed ${finance.month}: $${finance.revenue} sales, $${finance.netProfit} estimated profit, ${finance.margin}% margin.`,
      guardrail: "Owner-only report; no bank movement, tax filing, payroll change, or accounting submission.",
      evidence: `Cash buffer estimated at ${finance.cashBufferDays} days; ${finance.leak}`,
      visibilityRoles: ["owner"],
      inboxRole: "",
      payload: finance
    }),
    autonomousAction({
      id: "auto-profit-leak-fix",
      title: "Auto-create profit leak fix",
      target: "Entire.io Owner Task",
      summary: `Found ${finance.leak}; created a pickup-first promotion and delivery-fee review task.`,
      guardrail: "Internal owner task only; no price, fee, menu, or public listing changes.",
      evidence: `${finance.month} margin ${finance.margin}% with ${signals.topItem} as the top profit item`,
      visibilityRoles: ["owner"],
      inboxRole: "",
      payload: {
        issue: finance.leak,
        fix: `Push pickup-first ${signals.topItem} offer before changing prices`,
        expectedImpact: "Protect margin without surprising customers"
      }
    }),
    autonomousAction({
      id: "auto-supplier-order-from-orders",
      title: "Auto-prepare supplier restock from regular orders",
      target: "Entire.io Vendor Order",
      summary: `Prepared reorder quantities tied to regular-customer favorites and the next peak window.`,
      guardrail: "Supplier order record only; no purchase, payment, or vendor submission.",
      evidence: `${customer.name} and other regulars repeatedly order ${signals.topItem}`,
      inboxRole: "manager",
      payload: {
        item: signals.storeType.toLowerCase().includes("restaurant") ? "takeout bags and containers" : "top-selling shelf stock",
        reason: `Protect ${signals.topItem} demand in ${city}`,
        purchaseBlockedUntilOwnerApproves: true
      }
    }),
    autonomousAction({
      id: "auto-staff-coverage-ping",
      title: "Auto-ping staff coverage",
      target: "Entire.io Staff Message",
      summary: `Asked the team for coverage before ${signals.peak} and attached the prep checklist.`,
      guardrail: "Internal staff message only; no schedule change, payroll change, or customer-facing promise.",
      evidence: `${signals.peak} demand signal plus ${signals.regularCount} regular-customer demand`,
      inboxRole: "manager",
      payload: {
        message: `Can someone cover pickup flow before ${signals.peak}? Righthand AI expects ${signals.topItem} demand.`,
        assigneeRole: "manager",
        scheduleChangeBlocked: true
      }
    }),
    autonomousAction({
      id: "auto-sidewalk-signage-note",
      title: "Auto-message associate with safe ops note",
      target: "Entire.io Internal Message",
      summary: `Sent an internal note for sidewalk signage and pickup flow before ${signals.peak}.`,
      guardrail: "Internal teammate note only; no public profile, customer send, or schedule change.",
      evidence: intel?.weatherForecast?.[0]?.precipitationSum ? "Weather risk plus customer pickup history" : "Peak demand plus customer pickup history",
      inboxRole: "associate",
      payload: {
        message: `Before ${signals.peak}, keep signage weather-safe and make pickup for ${signals.topItem} easy.`,
        assigneeRole: "associate"
      }
    })
  ];
}

function autonomousAction(input) {
  return {
    id: input.id,
    title: input.title,
    target: input.target,
    category: "safe-autonomy",
    risk: "low",
    summary: input.summary,
    guardrail: input.guardrail,
    evidence: input.evidence,
    inboxRole: input.inboxRole,
    payload: input.payload || {},
    visibilityRoles: input.visibilityRoles || [],
    policy: {
      decision: "auto_safe",
      tone: "good",
      reason: input.guardrail
    }
  };
}

function redactAutonomousAction(action) {
  return {
    ...action,
    evidence: String(action.evidence || "")
      .replace(DEMO_CUSTOMER_EMAIL, "an opted-in regular customer")
      .replace(/Dhrumil Regular/g, "A regular customer"),
    payload: {
      ...action.payload,
      to: undefined,
      draftTo: undefined,
      customerEmail: undefined,
      customerIds: undefined
    }
  };
}

function agentInboxForUser(user) {
  return DELEGATED_AGENT_INBOX
    .filter((item) => item.tenantId === user.tenantId)
    .filter((item) => item.toUserId === user.id || item.toRole === user.role || item.fromUserId === user.id)
    .sort((a, b) => new Date(b.updatedAt || b.at) - new Date(a.updatedAt || a.at))
    .slice(0, 30);
}

function agentAuditForTenant(tenantId, limit = 30) {
  return DELEGATED_ACTION_AUDIT
    .filter((event) => event.tenantId === tenantId)
    .slice(0, limit);
}

function agentAuditForUser(user, limit = 30) {
  const events = agentAuditForTenant(user.tenantId, limit);
  return user.role === "owner" ? events : events.map(redactAuditEvent);
}

function redactAuditEvent(event) {
  const redactText = (value) => typeof value === "string"
    ? value
      .replace(DEMO_CUSTOMER_EMAIL, "an opted-in regular customer")
      .replace(/Dhrumil Regular/g, "A regular customer")
      .replace(/lunch\.buyer@example\.com|family\.order@example\.com/g, "a customer")
    : value;
  return {
    ...event,
    reason: redactText(event.reason),
    evidence: redactText(event.evidence),
    scalekit: redactText(event.scalekit),
    entire: redactText(event.entire),
    gmail: redactText(event.gmail)
  };
}

function createApprovalRequest({ user, store, action, policy, auditEvent }) {
  const now = new Date().toISOString();
  const duplicate = DELEGATED_AGENT_INBOX.find((item) =>
    item.type === "approval" &&
    item.status === "pending" &&
    item.tenantId === user.tenantId &&
    item.fromUserId === user.id &&
    item.action?.id === action.id
  );
  if (duplicate) {
    duplicate.updatedAt = now;
    duplicate.body = `${user.name} refreshed the approval request for ${action.title}.`;
    duplicate.auditId = auditEvent.id;
    return duplicate;
  }

  const item = {
    id: `inbox-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: "approval",
    status: "pending",
    at: now,
    updatedAt: now,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    fromUserId: user.id,
    fromUserName: user.name,
    fromRole: user.role,
    toRole: "owner",
    title: `Approval needed: ${action.title}`,
    body: `${user.name} can prepare this, but owner permission is required before Righthand AI can execute it.`,
    action,
    store,
    policy,
    auditId: auditEvent.id,
    target: action.target
  };
  DELEGATED_AGENT_INBOX.unshift(item);
  return item;
}

async function createDelegatedMessage(body = {}) {
  const user = await resolveAgentUser(body.userId || body.user?.id || "associate-mia");
  const store = storeFromPayload(body.store) || DEFAULT_PROFILE;
  const action = normalizeDelegatedAction(body.action, store, body.intel);
  const toRole = body.toRole || (user.role === "associate" ? "manager" : "owner");
  const now = new Date().toISOString();
  const item = {
    id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: "message",
    status: "open",
    at: now,
    updatedAt: now,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    fromUserId: user.id,
    fromUserName: user.name,
    fromRole: user.role,
    toRole,
    title: `${user.name} needs help: ${action.title}`,
    body: body.message || `${user.name} was blocked from ${action.title}. Review the evidence and decide whether to request owner approval or handle it as manager.`,
    action,
    store,
    target: action.target
  };
  DELEGATED_AGENT_INBOX.unshift(item);
  DELEGATED_ACTION_AUDIT.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    at: now,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    storeName: store.businessName || "Unnamed storefront",
    actionId: action.id,
    actionTitle: action.title,
    target: action.target,
    decision: "messaged",
    reason: `Escalated to ${roleLabel(toRole)} after a blocked permission check.`,
    evidence: action.evidence,
    executed: false
  });
  return { ok: true, item, message: `Message sent to ${roleLabel(toRole)}.` };
}

async function approveDelegatedRequest(body = {}) {
  const approver = await resolveAgentUser(body.userId || body.user?.id || "owner-ava");
  if (approver.role !== "owner") {
    return { ok: false, error: `${approver.title} cannot approve owner-gated delegated requests.` };
  }
  const item = DELEGATED_AGENT_INBOX.find((entry) => entry.id === body.requestId || entry.id === body.id);
  if (!item) return { ok: false, error: "Approval request not found." };
  if (item.tenantId !== approver.tenantId) return { ok: false, error: "Approval request belongs to another tenant." };
  if (item.type !== "approval") return { ok: false, error: "This inbox item is not an approval request." };

  item.status = "approved";
  item.approvedBy = approver.name;
  item.approvedByUserId = approver.id;
  item.updatedAt = new Date().toISOString();

  const result = await executeDelegatedAction({
    userId: approver.id,
    store: item.store,
    action: item.action,
    intel: body.intel
  });

  item.status = result.executed ? "executed" : "approval_failed";
  item.executionAuditId = result.auditEvent?.id || "";
  item.externalRef = result.entire?.referenceId || "";
  item.executionMessage = result.message || result.error || "";
  item.updatedAt = new Date().toISOString();

  return {
    ...result,
    ok: result.ok,
    item,
    message: result.executed
      ? `${approver.name} approved and executed ${item.action.title}.`
      : result.message || "Approval was recorded, but execution did not complete."
  };
}

function roleLabel(role) {
  if (role === "owner") return "owner";
  if (role === "manager") return "manager";
  if (role === "associate") return "associate";
  return String(role || "teammate");
}

function agentIntegrationStatus() {
  const scalekitConfigured = Boolean(process.env.SCALEKIT_ENVIRONMENT_URL && process.env.SCALEKIT_CLIENT_ID && process.env.SCALEKIT_CLIENT_SECRET);
  const entireConfigured = Boolean(process.env.ENTIRE_API_KEY || process.env.ENTIRE_API_URL);
  const apifyConfigured = Boolean(process.env.APIFY_TOKEN || scalekitConfigured);
  return {
    apify: {
      configured: apifyConfigured,
      mode: process.env.APIFY_TOKEN ? "live" : scalekitConfigured ? "active-through-scalekit" : "public-fallback",
      role: "Live market and supplier evidence"
    },
    scalekit: {
      configured: scalekitConfigured,
      mode: scalekitConfigured ? (process.env.SCALEKIT_MODE || "connected") : "not-connected",
      role: "Delegated user authorization and permission boundary"
    },
    gmail: {
      configured: scalekitConfigured,
      mode: scalekitConfigured ? "active-through-scalekit" : "not-connected",
      role: "Owner-scoped comeback sends and customer follow-up"
    },
    entire: {
      configured: entireConfigured,
      mode: entireConfigured ? (process.env.ENTIRE_MODE || "connected") : "local-record",
      role: "Business action destination for CRM/campaign/task updates"
    },
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      mode: process.env.GEMINI_API_KEY ? (process.env.GEMINI_MODEL || "gemini-2.5-flash") : "not configured",
      role: "LLM answer synthesis when Anthropic is not configured"
    }
  };
}

async function resolveAgentUsers() {
  if (!scalekitConfiguredForTools()) {
    SCALEKIT_RBAC_CACHE.source = "local-demo";
    SCALEKIT_RBAC_CACHE.error = "";
    return DEMO_AGENT_USERS;
  }
  const now = Date.now();
  if (SCALEKIT_RBAC_CACHE.users && now - SCALEKIT_RBAC_CACHE.at < SCALEKIT_RBAC_TTL_MS) {
    return SCALEKIT_RBAC_CACHE.users;
  }
  try {
    const live = await loadScalekitRbacUsers();
    SCALEKIT_RBAC_CACHE.at = now;
    SCALEKIT_RBAC_CACHE.users = live.users;
    SCALEKIT_RBAC_CACHE.organizations = live.organizations;
    SCALEKIT_RBAC_CACHE.roles = live.roles;
    SCALEKIT_RBAC_CACHE.source = "scalekit-live";
    SCALEKIT_RBAC_CACHE.error = "";
    return live.users;
  } catch (error) {
    SCALEKIT_RBAC_CACHE.at = now;
    SCALEKIT_RBAC_CACHE.users = DEMO_AGENT_USERS.map((user) => ({ ...user, scalekitSource: "local-fallback" }));
    SCALEKIT_RBAC_CACHE.organizations = SCALEKIT_DEMO_STORES;
    SCALEKIT_RBAC_CACHE.roles = Object.entries(SCALEKIT_DEMO_PERMISSIONS).map(([name, permissions]) => ({ name, permissions }));
    SCALEKIT_RBAC_CACHE.source = "local-fallback";
    SCALEKIT_RBAC_CACHE.error = error.message;
    return SCALEKIT_RBAC_CACHE.users;
  }
}

async function resolveAgentUser(userId) {
  const users = await resolveAgentUsers();
  return selectAgentUser(users, userId);
}

function selectAgentUser(users, userId) {
  return users.find((user) => user.id === userId || user.role === userId || user.scalekitRole === userId || user.email === userId) || users[0] || DEMO_AGENT_USERS[0];
}

async function loadScalekitRbacUsers() {
  const defaultOrg = await getScalekitOrganizationByExternalId(DEFAULT_SCALEKIT_STORE.externalId);
  const organizations = [defaultOrg].filter(Boolean);
  const roles = await loadScalekitRoles(defaultOrg?.id);
  const users = [];

  for (const binding of SCALEKIT_DEMO_USER_BINDINGS) {
    const fallback = demoAgentUser(binding.id);
    const member = defaultOrg?.id ? await findScalekitOrgUser(defaultOrg.id, binding.email) : null;
    if (!member?.id) {
      users.push({ ...fallback, scalekitSource: "local-fallback", scalekitError: `No Scalekit member found for ${binding.email}` });
      continue;
    }
    const roleNames = await loadScalekitUserRoles(defaultOrg.id, member);
    const permissionNames = await loadScalekitUserPermissions(defaultOrg.id, member, roleNames);
    const role = normalizeAgentRole(roleNames[0] || binding.role);
    const demoByRole = demoAgentUser(role);
    const profile = member.user_profile || member.userProfile || member.profile || {};
    users.push({
      ...demoByRole,
      id: binding.id,
      name: displayNameFromScalekitMember(member, binding.name),
      email: emailFromScalekitMember(member, binding.email),
      role,
      title: roleTitle(role, binding.title),
      tenantId: defaultOrg.external_id || defaultOrg.externalId || DEFAULT_SCALEKIT_STORE.externalId,
      tenantName: defaultOrg.display_name || defaultOrg.displayName || defaultOrg.name || DEFAULT_SCALEKIT_STORE.name,
      scalekitUserId: member.id,
      scalekitOrganizationId: defaultOrg.id,
      scalekitOrganizationExternalId: defaultOrg.external_id || defaultOrg.externalId || DEFAULT_SCALEKIT_STORE.externalId,
      scalekitRole: role,
      scalekitRoleNames: roleNames,
      scalekitPermissions: permissionNames,
      scalekitSource: "scalekit-live",
      firstName: profile.first_name || profile.firstName || "",
      lastName: profile.last_name || profile.lastName || ""
    });
  }

  return {
    users,
    organizations: organizations.map((org) => ({
      id: org.id,
      displayName: org.display_name || org.displayName || org.name,
      externalId: org.external_id || org.externalId || DEFAULT_SCALEKIT_STORE.externalId,
      address: org.metadata?.address || DEFAULT_SCALEKIT_STORE.address,
      metadata: org.metadata || {}
    })),
    roles
  };
}

async function getScalekitOrganizationByExternalId(externalId) {
  try {
    const payload = await scalekitApi(`/api/v1/organizations:external/${encodeURIComponent(externalId)}`);
    return unwrapPayload("organization", payload) || payload;
  } catch {
    return null;
  }
}

async function loadScalekitRoles(orgId) {
  const localRoles = Object.entries(SCALEKIT_DEMO_PERMISSIONS).map(([name, permissions]) => ({ name, permissions }));
  try {
    const payload = orgId
      ? await scalekitApi(`/api/v1/organizations/${encodeURIComponent(orgId)}/roles?include=permissions:all`)
      : await scalekitApi("/api/v1/roles");
    const roles = extractPayloadList(payload);
    return roles.length ? roles.map((role) => ({
      name: role.name || role.role_name || role.roleName,
      displayName: role.display_name || role.displayName || humanizeKey(role.name || role.role_name || ""),
      permissions: permissionNamesFromPayload(role.permissions || role.effective_permissions || role.effectivePermissions)
    })).filter((role) => role.name) : localRoles;
  } catch {
    return localRoles;
  }
}

async function findScalekitOrgUser(orgId, query) {
  try {
    const payload = await scalekitApi(`/api/v1/organizations/${encodeURIComponent(orgId)}/users:search?${new URLSearchParams({ query, page_size: "10" })}`);
    return extractPayloadList(payload).find((user) => sameEmail(user, query)) || extractPayloadList(payload)[0] || null;
  } catch {
    return null;
  }
}

async function loadScalekitUserRoles(orgId, member) {
  const fromMember = userRoleNamesFromPayload(member);
  try {
    const payload = await scalekitApi(`/api/v1/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(member.id)}/roles`);
    const fromEndpoint = extractPayloadList(payload).map(roleNameFromPayload).filter(Boolean);
    return uniqueLower([...fromEndpoint, ...fromMember]);
  } catch {
    return uniqueLower(fromMember);
  }
}

async function loadScalekitUserPermissions(orgId, member, roleNames = []) {
  try {
    const payload = await scalekitApi(`/api/v1/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(member.id)}/permissions`);
    const fromEndpoint = permissionNamesFromPayload(extractPayloadList(payload).length ? extractPayloadList(payload) : payload.permissions || payload.data || []);
    if (fromEndpoint.length) return uniqueLower(fromEndpoint);
  } catch {
    // Fall through to permissions inherited from Scalekit roles or local role defaults.
  }
  const fromRoles = roleNames.flatMap((role) => SCALEKIT_DEMO_PERMISSIONS[normalizeAgentRole(role)] || []);
  return uniqueLower(fromRoles);
}

function unwrapPayload(key, payload) {
  if (!payload || typeof payload !== "object") return null;
  return payload[key] || payload[camelKey(key)] || payload.data?.[key] || payload.data?.[camelKey(key)] || null;
}

function extractPayloadList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["users", "organizations", "roles", "permissions", "items", "data", "results", "role_assignments", "roleAssignments"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function userRoleNamesFromPayload(user) {
  const roles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.membership?.roles) ? user.membership.roles : []),
    ...(Array.isArray(user?.memberships) ? user.memberships.flatMap((membership) => membership.roles || []) : [])
  ];
  return uniqueLower(roles.map(roleNameFromPayload).filter(Boolean));
}

function roleNameFromPayload(role) {
  if (typeof role === "string") return normalizeAgentRole(role);
  return normalizeAgentRole(role?.name || role?.role_name || role?.roleName || role?.role?.name || role?.role?.role_name || "");
}

function permissionNamesFromPayload(value) {
  const list = Array.isArray(value) ? value : extractPayloadList(value);
  return uniqueLower(list.map((permission) => {
    if (typeof permission === "string") return permission;
    return permission?.name || permission?.permission_name || permission?.permissionName || permission?.permission?.name || "";
  }).filter(Boolean));
}

function normalizeAgentRole(role) {
  const text = String(role || "").toLowerCase().trim();
  if (/owner|admin/.test(text)) return "owner";
  if (/manager/.test(text)) return "manager";
  if (/associate|member|staff|front/.test(text)) return "associate";
  return text || "associate";
}

function roleTitle(role, fallback = "") {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Store manager";
  if (role === "associate") return "Front counter associate";
  return fallback || humanizeKey(role);
}

function displayNameFromScalekitMember(member, fallback) {
  const profile = member?.user_profile || member?.userProfile || member?.profile || {};
  return member?.name || profile.name || [profile.first_name || profile.firstName, profile.last_name || profile.lastName].filter(Boolean).join(" ") || fallback;
}

function emailFromScalekitMember(member, fallback) {
  return member?.email || member?.primary_email || member?.primaryEmail || member?.user_profile?.email || member?.userProfile?.email || fallback;
}

function sameEmail(user, email) {
  return emailFromScalekitMember(user, "").toLowerCase() === String(email || "").toLowerCase();
}

function uniqueLower(values) {
  return [...new Set(values.map((value) => String(value || "").toLowerCase().trim()).filter(Boolean))];
}

function humanizeKey(value) {
  return String(value || "")
    .replace(/[_:.-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function camelKey(value) {
  return String(value || "").replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function demoAgentUser(userId) {
  return DEMO_AGENT_USERS.find((user) => user.id === userId || user.role === userId) || DEMO_AGENT_USERS[0];
}

function storeFromPayload(store) {
  if (!store || typeof store !== "object") return null;
  const address = [store.address, store.address2, store.city, store.state, store.zip].map((part) => String(part || "").trim()).filter(Boolean).join(", ");
  return {
    businessName: store.businessName || store.name || "Unnamed storefront",
    businessType: normalizeType(store.businessType || store.type || "retail"),
    address: address || store.address || "",
    city: store.city || inferCityFromPayload(store.address || ""),
    state: store.state || "CA",
    lat: Number(store.lat),
    lon: Number(store.lon),
    radiusMeters: Number(store.radiusMeters || 0)
  };
}

function normalizeDelegatedAction(action, store, intel) {
  if (action && typeof action === "object" && action.id && action.title) return action;
  return recommendedDelegatedActions(store, intel)[0];
}

function recommendedDelegatedActions(store, intel) {
  const type = labelForType(store.businessType || "retail").toLowerCase();
  const city = store.city || "your city";
  const firstOpportunity = intel?.opportunities?.[0];
  const firstWarning = (intel?.warnings || []).find((warning) => warning.urgency !== "Low") || intel?.warnings?.[0];
  const market = intel?.marketIntelligence || {};
  const peak = market.busyHeatmap?.peakDay
    ? `${market.busyHeatmap.peakDay} ${formatHour12(market.busyHeatmap.peakHour)}`
    : "next peak window";
  const topTheme = market.topReviewTags?.[0]?.title || (type.includes("restaurant") ? "signature item" : "best seller");
  const compliance = intel?.licenseChecklist?.find((item) => item.priority === "required") || null;
  const apifyEvidence = intel?.marketProvider === "apify"
    ? `Apify Google Places: ${market.competitorsAnalyzed || intel.marketPlaces?.length || 0} nearby records`
    : `Public scan: ${intel?.marketPlaces?.length || 0} nearby map records`;

  return [
    delegatedAction({
      id: "publish-peak-promo",
      title: `Publish a ${peak} promo`,
      target: "Entire.io Campaign",
      category: "customer-growth",
      risk: "medium",
      requiredScopes: ["marketing.campaign.write", "customer.segment.write"],
      allowedRoles: ["owner", "manager"],
      summary: `Use Righthand AI's live demand scan to create a targeted offer for customers near ${city}.`,
      payload: {
        campaignName: `${store.businessName || "Store"} ${peak} demand offer`,
        audience: `${city} nearby customers`,
        offer: `Feature ${topTheme} during ${peak}`,
        evidence: apifyEvidence
      },
      evidence: firstOpportunity?.title || apifyEvidence,
      nextStep: "Create a campaign draft in Entire, tagged to this storefront and user."
    }),
    delegatedAction({
      id: "build-customer-recovery-segment",
      title: "Build customer recovery segment",
      target: "Entire.io Customer Segment",
      category: "customer-recovery",
      risk: "medium",
      requiredScopes: ["customer.segment.write", "marketing.campaign.write"],
      allowedRoles: ["owner", "manager"],
      summary: `Group customers most likely to come back after ${topTheme} or service-related review signals.`,
      payload: {
        segmentName: `${store.businessName || "Store"} recovery audience`,
        audience: `Recent visitors and lapsed locals near ${city}`,
        trigger: market.topReviewTags?.length ? market.topReviewTags.map((tag) => tag.title).slice(0, 3) : ["recent demand shift"],
        offer: `Invite back with a focused ${topTheme} recovery offer`
      },
      evidence: market.topReviewTags?.[0]?.title
        ? `Review theme: ${market.topReviewTags[0].title}`
        : apifyEvidence,
      nextStep: "Create the customer segment and attach the live market evidence."
    }),
    delegatedAction({
      id: "send-review-recovery-message",
      title: "Send review recovery message",
      target: "Entire.io Customer Message",
      category: "customer-recovery",
      risk: "medium",
      requiredScopes: ["customer.message.write"],
      allowedRoles: ["owner", "manager"],
      summary: `Draft and send a customer-safe response for guests affected by the issue Righthand AI found.`,
      payload: {
        channel: "email_or_sms",
        template: `${store.businessName || "We"} noticed the issue and saved a small comeback offer for you.`,
        guardrail: "No medical, legal, or sensitive claims; only store-owned customer records"
      },
      evidence: firstWarning?.title || market.topReviewTags?.[0]?.title || "Customer risk signal",
      nextStep: "Send through Entire as the signed-in storefront user."
    }),
    delegatedAction({
      id: "issue-recovery-credit",
      title: "Issue recovery credit",
      target: "Entire.io Customer Credit",
      category: "customer-recovery",
      risk: "high",
      requiredScopes: ["customer.credit.write"],
      allowedRoles: ["owner"],
      approvalRoles: ["manager"],
      summary: "Offer a tightly capped credit to save high-value repeat customers without giving every employee refund power.",
      payload: {
        cap: 150,
        rule: "Repeat customers only; owner approval required",
        reason: firstWarning?.title || "Customer retention risk"
      },
      evidence: firstWarning?.title || firstOpportunity?.title || "Retention opportunity",
      nextStep: "Owner approves the credit policy; Entire records the user-scoped credit event."
    }),
    delegatedAction({
      id: "update-extended-hours",
      title: "Update extended-hours recommendation",
      target: "Google Business Profile via Scalekit",
      category: "storefront-ops",
      risk: "high",
      requiredScopes: ["storefront.hours.write"],
      allowedRoles: ["owner"],
      approvalRoles: ["manager"],
      summary: `If the block is busy late, let the owner update public hours as the real store user.`,
      payload: {
        proposedHours: `Pilot extended coverage around ${peak}`,
        reason: market.hoursCoverage?.openLateCount
          ? `${market.hoursCoverage.openLateCount} nearby places stay open past 9pm`
          : `Peak demand signal found for ${peak}`
      },
      evidence: market.hoursCoverage?.contributing
        ? `${market.hoursCoverage.contributing} competitor schedules parsed`
        : apifyEvidence,
      nextStep: "Owner approves and Scalekit executes the connected profile update on their behalf."
    }),
    delegatedAction({
      id: "create-compliance-task",
      title: `Create compliance task: ${compliance?.name || "required documents"}`,
      target: "Entire.io Task",
      category: "compliance",
      risk: "medium",
      requiredScopes: ["compliance.task.write"],
      allowedRoles: ["owner", "manager"],
      summary: `Turn a required permit or document into an assigned follow-up with the evidence link attached.`,
      payload: {
        task: compliance?.name || "Review required storefront documents",
        authority: compliance?.authority || "Local authority",
        evidenceUrl: compliance?.url || "",
        priority: compliance?.priority || "required"
      },
      evidence: compliance?.url || firstWarning?.title || "Compliance checklist",
      nextStep: "Create the task in Entire with the current user's identity and tenant."
    }),
    delegatedAction({
      id: "draft-supplier-order",
      title: "Draft a supplier restock order",
      target: "Entire.io Vendor Order",
      category: "inventory",
      risk: "high",
      requiredScopes: ["suppliers.order.write"],
      allowedRoles: ["owner"],
      approvalRoles: ["manager"],
      summary: `Prepare a restock order for the item most likely to protect tomorrow's sales.`,
      payload: {
        item: type.includes("restaurant") ? "takeout containers" : "cleaning supplies",
        estimatedBudget: 320,
        guardrail: "Draft only unless owner approves purchase"
      },
      evidence: firstOpportunity?.title || "Restock recommendation",
      nextStep: "Draft order in Entire; require owner approval before money moves."
    })
  ];
}

function delegatedAction(input) {
  return {
    id: input.id,
    title: input.title,
    target: input.target,
    category: input.category,
    risk: input.risk || "medium",
    requiredScopes: input.requiredScopes || [],
    allowedRoles: input.allowedRoles || ["owner"],
    approvalRoles: input.approvalRoles || [],
    summary: input.summary,
    payload: input.payload || {},
    evidence: input.evidence || "",
    nextStep: input.nextStep || "Execute with delegated user identity."
  };
}

function evaluateDelegatedPolicy(user, action) {
  const requiredPermissions = requiredScalekitPermissionsForAction(action);
  const grantedPermissions = uniqueLower(user.scalekitPermissions || []);
  const missingPermissions = requiredPermissions.filter((permission) => !grantedPermissions.includes(permission));
  const missingScopes = (action.requiredScopes || []).filter((scope) => !hasDelegatedScope(user, scope));
  const roleAllowed = (action.allowedRoles || []).includes(user.role);
  const approvalAllowed = (action.approvalRoles || []).includes(user.role);
  if (roleAllowed && !missingScopes.length && !missingPermissions.length) {
    return {
      decision: "allowed",
      tone: "good",
      reason: `${user.title} has the Scalekit ${user.scalekitRole || user.role} role and ${requiredPermissions.join(", ") || "required"} permission for this tenant.`,
      requiredPermissions,
      grantedBy: user.scalekitSource || "local-fallback"
    };
  }
  if (approvalAllowed || (user.role === "manager" && action.risk === "high")) {
    return {
      decision: "needs_approval",
      tone: "warn",
      reason: `${user.title} can prepare this action, but Scalekit requires owner approval before execution.`,
      missingScopes,
      missingPermissions,
      requiredPermissions,
      grantedBy: user.scalekitSource || "local-fallback"
    };
  }
  return {
    decision: "blocked",
    tone: "risk",
    reason: `${user.title} cannot execute ${action.title}; Scalekit requires ${action.allowedRoles.join(" or ")} with ${requiredPermissions.join(", ") || "the required permission"}.`,
    missingScopes,
    missingPermissions,
    requiredPermissions,
    grantedBy: user.scalekitSource || "local-fallback"
  };
}

function requiredScalekitPermissionsForAction(action) {
  return uniqueLower((action.requiredPermissions || [])
    .concat((action.requiredScopes || []).map((scope) => DELEGATED_SCOPE_TO_SCALEKIT_PERMISSION[scope] || scope.replace(/\./g, ":"))));
}

function hasDelegatedScope(user, scope) {
  if ((user.scopes || []).includes(scope)) return true;
  const permission = DELEGATED_SCOPE_TO_SCALEKIT_PERMISSION[scope] || scope.replace(/\./g, ":");
  return uniqueLower(user.scalekitPermissions || []).includes(permission);
}

async function executeScalekitDelegation({ user, store, action }) {
  const configured = Boolean(process.env.SCALEKIT_ENVIRONMENT_URL && process.env.SCALEKIT_CLIENT_ID && process.env.SCALEKIT_CLIENT_SECRET);
  const liveUrl = process.env.SCALEKIT_AGENT_PROXY_URL || "";
  if (configured && liveUrl) {
    try {
      const response = await fetchJson(liveUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.SCALEKIT_CLIENT_SECRET}`
        },
        body: JSON.stringify({ user, store, action })
      }, 12000);
      return {
        mode: "live",
        summary: "Scalekit proxy executed user-scoped authorization",
        response
      };
    } catch (error) {
      return {
        mode: "live-ready-fallback",
        summary: `Scalekit live proxy not reachable: ${error.message}`,
        response: null
      };
    }
  }
  return {
    mode: configured ? "connected" : "local-policy",
    summary: `Authorized ${action.title} as ${user.email} for tenant ${user.tenantId} using ${user.scalekitSource === "scalekit-live" ? "Scalekit org roles and permissions" : "local Scalekit fallback roles"}`,
    connectedAccount: {
      provider: "scalekit",
      userId: user.id,
      tenantId: user.tenantId,
      scopes: action.requiredScopes,
      roles: user.scalekitRoleNames || [user.scalekitRole || user.role],
      permissions: requiredScalekitPermissionsForAction(action),
      status: "ACTIVE"
    }
  };
}

async function executeEntireAction({ user, store, action, scalekit }) {
  const configured = Boolean(process.env.ENTIRE_API_KEY || process.env.ENTIRE_API_URL);
  const apiUrl = process.env.ENTIRE_API_URL || "";
  const referenceId = `entire-${Date.now()}-${slugify(action.id).slice(0, 20)}`;
  if (configured && apiUrl) {
    try {
      const response = await fetchJson(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.ENTIRE_API_KEY ? { authorization: `Bearer ${process.env.ENTIRE_API_KEY}` } : {})
        },
        body: JSON.stringify({
          referenceId,
          actor: { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
          storefront: { name: store.businessName, city: store.city, type: store.businessType },
          action,
          delegatedAuth: scalekit.connectedAccount || scalekit.summary
        })
      }, 12000);
      return { mode: "live", summary: "Entire action endpoint accepted the user-scoped payload", referenceId, response };
    } catch (error) {
      return { mode: "live-ready-fallback", summary: `Entire endpoint not reachable: ${error.message}`, referenceId, response: null };
    }
  }
  return {
    mode: configured ? "connected" : "local-record",
    summary: `Created ${action.target} record as ${user.email}`,
    referenceId,
    record: {
      id: referenceId,
      object: action.target,
      owner: user.email,
      tenantId: user.tenantId,
      payload: action.payload
    }
  };
}

async function executeGmailAutomation({ user, store, action, demoRecipient, delivery }) {
  if (!/gmail/i.test(action.target || "")) return null;

  if (!scalekitConfiguredForTools()) {
    return {
      mode: "not-connected",
      summary: "Gmail send skipped because Scalekit is not connected"
    };
  }

  try {
    const account = await findActiveScalekitAccount({
      connector: process.env.SCALEKIT_GMAIL_CONNECTOR || "gmail",
      identifier: process.env.SCALEKIT_GMAIL_IDENTIFIER || process.env.DEMO_OWNER_EMAIL || user.email,
      providerPattern: /gmail/i
    });
    if (!account) {
      return {
        mode: "pending",
        summary: "Gmail connected account is not active yet; internal recovery work was still logged"
      };
    }

    const recipient = safeDemoRecipient(action.payload?.to, account.identifier, demoRecipient);
    const deliveryMode = gmailDeliveryMode(action.payload?.delivery || delivery, recipient);
    const subject = action.payload?.subject || `${store.businessName || "Your store"} owner message`;
    const greeting = `Hi ${firstNameFromCustomer(action.payload?.customerName) || "there"},`;
    const providedBody = String(action.payload?.body || "").trim();
    const hasGreeting = /^(hi|hello|dear)\b/i.test(providedBody);
    const body = providedBody
      ? [
          action.payload?.customerName && !hasGreeting ? greeting : "",
          providedBody,
          "",
          `Prepared by Righthand AI from the Apify demand scan and owner-approved customer memory for ${store.businessName || "this storefront"}.`
        ].filter(Boolean).join("\n")
      : [
          greeting,
          `We saved your usual item at ${store.businessName || "your local store"}.`,
          "",
          `Prepared by Righthand AI from the Apify demand scan and owner-approved customer memory for ${store.businessName || "this storefront"}.`,
          "Owner review note: send only if this recipient opted in and has not received a similar note in the last 30 days."
        ].join("\n");

    const response = await createGmailMessageViaScalekit({
      connectedAccountId: account.id,
      to: recipient,
      subject,
      body,
      deliveryMode
    });

    return {
      mode: "live",
      summary: deliveryMode === "send"
        ? `Sent real Gmail email as ${account.identifier} to ${recipient} using the Scalekit connected account`
        : `Prepared real Gmail message as ${account.identifier} to ${recipient} using the Scalekit connected account`,
      connector: account.connector,
      connectedAccountId: account.id,
      delivery: deliveryMode,
      draftId: deliveryMode === "draft" ? response.id : null,
      messageId: deliveryMode === "send" ? response.id : response.message?.id,
      response
    };
  } catch (error) {
    return {
      mode: "live-ready-fallback",
      summary: `Gmail automation fallback: ${error.message}`,
      response: null
    };
  }
}

function scalekitConfiguredForTools() {
  return Boolean(process.env.SCALEKIT_ENVIRONMENT_URL && process.env.SCALEKIT_CLIENT_ID && process.env.SCALEKIT_CLIENT_SECRET);
}

function scalekitBaseUrl() {
  return String(process.env.SCALEKIT_ENVIRONMENT_URL || "").replace(/\/$/, "");
}

async function scalekitApi(route, options = {}) {
  const baseUrl = scalekitBaseUrl();
  const token = await fetchJson(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SCALEKIT_CLIENT_ID,
      client_secret: process.env.SCALEKIT_CLIENT_SECRET
    })
  }, 12000);
  return fetchJson(`${baseUrl}${route}`, {
    method: options.method || "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token.access_token}`,
      ...(options.headers || {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  }, options.timeoutMs || 12000);
}

async function findActiveScalekitAccount({ connector, identifier, providerPattern }) {
  const payload = await scalekitApi("/api/v1/connected_accounts?page_size=30");
  const accounts = connectedAccountsFromPayload(payload);
  const active = accounts.filter((account) => /active/i.test(String(account.status || "")));
  const connectorPattern = new RegExp(`^${escapeRegExp(connector)}$`, "i");
  return active.find((account) =>
    connectorPattern.test(String(account.connector || account.connection_name || account.connector_name || "")) &&
    String(account.identifier || "").toLowerCase() === String(identifier || "").toLowerCase()
  ) || active.find((account) =>
    connectorPattern.test(String(account.connector || account.connection_name || account.connector_name || ""))
  ) || active.find((account) =>
    providerPattern.test(String(account.provider || account.connector || ""))
  ) || null;
}

function connectedAccountsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.connected_accounts || payload?.data || payload?.items || [];
}

async function createGmailMessageViaScalekit({ connectedAccountId, to, subject, body, deliveryMode = "draft" }) {
  const detail = await getScalekitConnectedAccountAuth(connectedAccountId);
  const accessToken = scalekitOAuthAccessToken(detail);
  if (!accessToken) throw new Error("Scalekit connected account did not return an active Gmail access token");
  const raw = encodeGmailMime({
    to,
    subject,
    body
  });
  const endpoint = deliveryMode === "send"
    ? "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    : "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
  const payload = deliveryMode === "send"
    ? { raw }
    : { message: { raw } };
  return fetchJson(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  }, 12000);
}

async function getScalekitConnectedAccountAuth(connectedAccountId) {
  const id = encodeURIComponent(connectedAccountId);
  try {
    return await scalekitApi(`/api/v1/connected_accounts/auth?id=${id}`);
  } catch {
    return scalekitApi(`/api/v1/connected_accounts/${id}`);
  }
}

function scalekitOAuthAccessToken(payload) {
  const account = payload?.connectedAccount || payload?.connected_account || payload?.account || payload;
  const auth = account?.authorizationDetails || account?.authorization_details || payload?.authorizationDetails || payload?.authorization_details || {};
  const cases = [
    auth?.details?.case === "oauthToken" ? auth?.details?.value?.accessToken : "",
    auth?.details?.case === "oauth_token" ? auth?.details?.value?.access_token : "",
    auth?.details?.value?.accessToken,
    auth?.details?.value?.access_token,
    auth?.oauthToken?.accessToken,
    auth?.oauth_token?.access_token,
    auth?.oauth_token?.accessToken,
    auth?.accessToken,
    auth?.access_token,
    account?.oauthToken?.accessToken,
    account?.oauth_token?.access_token,
    account?.accessToken,
    account?.access_token
  ];
  return cases.find((value) => typeof value === "string" && value.length > 20) || "";
}

function safeDemoRecipient(candidate, fallback, requested) {
  const value = String(requested || process.env.WARDEN_GMAIL_DEMO_TO || DEMO_CUSTOMER_EMAIL || candidate || "").trim();
  if (value && !/@example\.com$/i.test(value)) return value;
  return fallback || value || "owner@business.local";
}

function gmailDeliveryMode(requested, recipient) {
  const mode = String(requested || process.env.WARDEN_GMAIL_DELIVERY || "send").toLowerCase();
  if (mode !== "send") return "draft";
  return approvedDemoRecipient(recipient) ? "send" : "draft";
}

function approvedDemoRecipient(recipient) {
  const email = String(recipient || "").trim().toLowerCase();
  const allowList = [
    DEMO_CUSTOMER_EMAIL,
    process.env.WARDEN_GMAIL_DEMO_TO
  ].filter(Boolean).map((item) => String(item).trim().toLowerCase());
  return allowList.includes(email);
}

function encodeGmailMime({ to, subject, body }) {
  const cleanTo = cleanEmailHeader(to);
  const cleanSubject = cleanEmailHeader(subject);
  const message = [
    `To: ${cleanTo}`,
    `Subject: ${cleanSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body
  ].join("\r\n");
  return Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function cleanEmailHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function firstNameFromCustomer(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function inferCityFromPayload(address) {
  const text = String(address || "").toLowerCase();
  return ["San Francisco", "Santa Clara", "San Jose", "Oakland", "Berkeley", "Palo Alto", "Mountain View", "Sunnyvale", "San Mateo"].find((city) => text.includes(city.toLowerCase())) || "";
}

async function handleChat({ message, store, intel, history }) {
  const text = String(message || "").trim();
  if (!text) {
    return { ok: false, error: "Empty message" };
  }
  const chatStore = store || {};
  const chatIntel = intel || null;
  const intent = detectChatIntent(text);
  const sentiment = detectChatSentiment(text);
  const liveContext = await buildChatLiveContext({ text, store: chatStore, intel: chatIntel, intent });
  const groundedReply = () => buildGroundedChatReply({ text, store: chatStore, intel: chatIntel, intent, sentiment, liveContext });
  if (intent === "product") {
    return {
      ok: true,
      reply: groundedReply(),
      provider: liveContext?.product?.options?.length ? "apify-restock" : "local-grounded",
      intent,
      sentiment
    };
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
    return {
      ok: true,
      reply: groundedReply(),
      provider: chatProviderForContext(intent, liveContext),
      intent,
      sentiment
    };
  }
  if (process.env.LIVE_LLM_CHAT !== "1") {
    return {
      ok: true,
      reply: groundedReply(),
      provider: chatProviderForContext(intent, liveContext),
      intent,
      sentiment
    };
  }

  const model = process.env.ANTHROPIC_API_KEY
    ? (process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001")
    : (process.env.GEMINI_MODEL || "gemini-2.5-flash");
  const system = [
    buildChatSystemPrompt(chatStore, chatIntel),
    buildChatLiveContextPrompt({ intent, sentiment, liveContext })
  ].filter(Boolean).join("\n\n");
  const messages = [];
  for (const turn of (Array.isArray(history) ? history : []).slice(-8)) {
    const role = turn?.role === "assistant" ? "assistant" : "user";
    const content = String(turn?.content || turn?.text || "").trim();
    if (content) messages.push({ role, content });
  }
  const routedUserContent = `${text}\n\nDetected owner sentiment: ${sentiment}.\nDetected intent: ${intent}. Answer like a practical small-business operator, not a generic chatbot.`;
  if (!messages.length || messages[messages.length - 1].content !== text) {
    messages.push({ role: "user", content: routedUserContent });
  } else {
    messages[messages.length - 1].content = routedUserContent;
  }

  if (!process.env.ANTHROPIC_API_KEY && process.env.GEMINI_API_KEY) {
    const llm = await callGeminiChat({ model, system, messages });
    if (llm.ok) return { ...llm, provider: llm.provider || "gemini", intent, sentiment };
    return {
      ok: true,
      reply: groundedReply(),
      provider: chatProviderForContext(intent, liveContext),
      intent,
      sentiment,
      fallback: true,
      error: llm.error || "Gemini fallback"
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system,
        messages
      })
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        ok: true,
        reply: groundedReply(),
        provider: chatProviderForContext(intent, liveContext),
        intent,
        sentiment,
        fallback: true,
        error: `Anthropic ${response.status}: ${errText.slice(0, 240)}`
      };
    }
    const data = await response.json();
    const reply = (data.content || []).map((part) => part?.text || "").join("\n").trim();
    return {
      ok: true,
      reply: reply || "I didn't have anything to add — try asking about warnings, opportunities, weather, or competitor pricing.",
      model: data.model || model,
      usage: data.usage || null,
      provider: "anthropic",
      intent,
      sentiment
    };
  } catch (error) {
    return {
      ok: true,
      reply: groundedReply(),
      provider: chatProviderForContext(intent, liveContext),
      intent,
      sentiment,
      fallback: true,
      error: `Chat call failed: ${error.message}`
    };
  }
}

function chatProviderForContext(intent, liveContext) {
  if (intent === "product" && liveContext?.product?.options?.length) return "apify-restock";
  if (liveContext?.lookup?.places?.provider?.includes("apify")) return "apify-web";
  if (liveContext?.lookup) return "open-web";
  if (intent === "news") return "web-news";
  return "local-grounded";
}

function detectChatIntent(text) {
  const t = String(text || "").toLowerCase();
  if (/(weather|rain|heat|hot|cold|storm|wind|air quality|forecast)/.test(t)) return "weather";
  if (/(review|rating|google review|1-star|one star|stars)/.test(t)) return "reviews";
  if (/(buy|find|available|availability|stock|restock|supplier|order|where can i get|where should i buy|in stock|tortilla|takeout|container|cup|napkin|chair|table|oil|parts?|jack|gloves?|receipt paper|utensils?|tomatoes?|produce|vegetables?)/.test(t)) return "product";
  if (/(footfall|foot traffic|walk[- ]?in|visits?|customers?|busy|slow|traffic)/.test(t)) return "footfall";
  if (/(loss|waste|spoil|spoilage|overstock|stockout|shortage|risk|threat|warning|safety|crime|danger)/.test(t)) return "risk";
  if (/(permit|license|inspection|compliance|document|health department|records?)/.test(t)) return "compliance";
  if (/(competitor|competition|compare|near me|nearby place|top-rated)/.test(t)) return "competitors";
  if (/(news|event|trend|internet|web|current|today around|happening|festival|concert|game)/.test(t)) return "news";
  if (/(tell me about|what is|who is|look up|search for|google|find info|information on|info about|do you know|where is|hours for|menu for|phone for|reviews? for)\b/.test(t)) return "web";
  if (/(profit|margin|sales|revenue|money|earn|pricing strategy|discount|promo|offer|coupon)/.test(t)) return "profit";
  return "general";
}

function detectChatSentiment(text) {
  const t = String(text || "").toLowerCase();
  if (/(urgent|worried|scared|stressed|panic|losing money|bad|terrible|angry|frustrated|confused|stuck|help me|declining|churn)/.test(t)) return "concerned";
  if (/(great|good|win|excited|nice|awesome|love|ready)/.test(t)) return "positive";
  if (/(should i|what if|can i|how do i|not sure|maybe)/.test(t)) return "uncertain";
  return "neutral";
}

async function buildChatLiveContext({ text, store, intel, intent }) {
  const profile = chatProfile(store, intel);
  const context = { profile };
  const productQuery = intent === "product" ? extractProductQuery(text, profile.businessType) : "";
  if (productQuery) {
    try {
      context.product = await buildRestockComparison(profile, new URLSearchParams({ q: productQuery }));
    } catch (error) {
      context.productError = error.message;
    }
  }
  const webQuery = extractWebLookupQuery(text, profile);
  if (webQuery && (intent === "web" || intent === "general" || intent === "news" || /\b(internet|web|current|happening|event|news|tell me about|look up|search)\b/i.test(text))) {
    try {
      const [places, web] = await Promise.all([
        fetchLivePlaceLookup(profile, webQuery).catch((error) => ({ ok: false, places: [], message: error.message })),
        fetchOpenWebLookup(profile, webQuery).catch((error) => ({ ok: false, articles: [], message: error.message }))
      ]);
      context.lookup = { query: webQuery, places, web, question: text };
    } catch (error) {
      context.lookupError = error.message;
    }
  }
  if (intent === "news" || /\b(internet|web|current|happening|event|news)\b/i.test(text)) {
    try {
      const [news, events] = await Promise.all([
        fetchNews(profile).catch((error) => ({ ok: false, articles: [], message: error.message })),
        fetchLocalEvents(profile).catch((error) => ({ ok: false, articles: [], message: error.message }))
      ]);
      context.news = news;
      context.events = events;
    } catch (error) {
      context.newsError = error.message;
    }
  }
  return context;
}

function chatProfile(store = {}, intel = null) {
  const profile = intel?.profile || {};
  const address = store.address || profile.locationLabel || profile.address || "";
  return {
    businessName: store.businessName || profile.businessName || "this shop",
    businessType: normalizeType(store.businessType || profile.businessType || "retail"),
    address,
    city: store.city || profile.city || inferCityFromPayload(address) || "San Francisco",
    state: store.state || profile.state || "CA",
    lat: Number.isFinite(Number(store.lat)) ? Number(store.lat) : Number(profile.lat),
    lon: Number.isFinite(Number(store.lon)) ? Number(store.lon) : Number(profile.lon),
    radiusMeters: Number(profile.radiusMeters || store.radiusMeters || 1600),
    avgTicket: store.avgTicket || "",
    suppliers: store.suppliers || ""
  };
}

function extractProductQuery(text, businessType) {
  const cleaned = String(text || "")
    .replace(/\b(i want to|want to|where can i|where should i|can i|do you|please|near me|nearby|around my shop|around the shop|available|availability|find|buy|get|restock|stock|supplier|suppliers|order|show me|i need|need|for my store|for my shop)\b/gi, " ")
    .replace(/[?!.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned && cleaned.length >= 3 && cleaned.length <= 80) return cleaned;
  const type = normalizeType(businessType);
  if (type === "restaurant" || type === "food stall") return "tortillas takeout containers";
  if (type === "auto repair") return "shop towels nitrile gloves";
  return "receipt paper";
}

function extractWebLookupQuery(text, profile = {}) {
  const raw = String(text || "").replace(/[?!]+/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();
  const shopOnly = /(increase profit|reduce waste|get more reviews|get more footfall|what should i prep|how do i sell|what permits|what warnings|what threats)/i.test(raw);
  if (shopOnly) return "";
  const cleaned = raw
    .replace(/\b(can you|could you|please|i want to|want to|tell me about|what is|who is|look up|search for|google|find info about|find information about|information on|info about|do you know|where is|hours for|menu for|phone for|reviews? for)\b/gi, " ")
    .replace(/\b(my store|this store|the store|near me|nearby|around my shop|around the shop|in my area)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length >= 3 && cleaned.length <= 90) return cleaned;
  const quoted = raw.match(/["“”']([^"“”']{3,90})["“”']/);
  if (quoted) return quoted[1].trim();
  const named = raw.match(/\b([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,5})\b/);
  if (named && !new RegExp(`^${escapeRegExp(profile.city || "")}$`, "i").test(named[1])) return named[1].trim();
  if (/\b(news|event|trend|happening|current)\b/i.test(raw)) return [profile.businessType, profile.city].filter(Boolean).join(" ").trim();
  return lowered === raw ? "" : raw.slice(0, 90);
}

function buildChatLiveContextPrompt({ intent, sentiment, liveContext }) {
  const lines = [
    "CHAT ROUTING:",
    `- Detected intent: ${intent}`,
    `- Detected sentiment: ${sentiment}`,
    "- If sentiment is concerned, acknowledge pressure briefly, then give concrete next steps.",
    "- Prioritize profit, loss reduction, footfall and reviews over generic explanation."
  ];
  if (liveContext?.product?.options?.length) {
    lines.push("");
    lines.push(`PRODUCT / SUPPLIER CONTEXT for "${liveContext.product.query}":`);
    for (const item of liveContext.product.options.slice(0, 5)) {
      lines.push(`- ${item.providerName || item.provider}: ${item.title}; ${item.price}; ${item.stock}; ${item.eta}; ${item.url}`);
    }
  }
  const articles = uniqueArticles([
    ...(liveContext?.news?.articles || []),
    ...(liveContext?.events?.articles || [])
  ]).slice(0, 8);
  if (articles.length) {
    lines.push("");
    lines.push("LOCAL WEB / NEWS CONTEXT:");
    for (const article of articles) {
      lines.push(`- ${article.title} (${article.domain || "news"}) ${article.url || ""}`);
    }
  }
  if (liveContext?.lookup) {
    const lookup = liveContext.lookup;
    const places = lookup.places?.places || [];
    const web = lookup.web || {};
    lines.push("");
    lines.push(`OPEN WEB LOOKUP for "${lookup.query}":`);
    if (places.length) {
      lines.push("Live place results:");
      for (const place of places.slice(0, 5)) {
        const bits = [
          place.name,
          place.category,
          place.rating ? `${place.rating}★` : "",
          place.reviews ? `${place.reviews} reviews` : "",
          place.address,
          place.website || place.url
        ].filter(Boolean);
        lines.push(`- ${bits.join(" · ")}`);
      }
    }
    if (web.abstract) lines.push(`Open web summary: ${web.abstract}`);
    if (web.wikipedia?.title) lines.push(`Wikipedia: ${web.wikipedia.title} — ${web.wikipedia.extract || ""} ${web.wikipedia.url || ""}`);
    const webArticles = uniqueArticles([...(web.articles || []), ...(web.news || [])]).slice(0, 6);
    if (webArticles.length) {
      lines.push("Related web/news results:");
      for (const article of webArticles) {
        lines.push(`- ${article.title} (${article.domain || "web"}) ${article.url || ""}`);
      }
    }
    lines.push("If the lookup is thin, say what was found and what is uncertain. Do not invent missing facts.");
  }
  return lines.join("\n");
}

function buildGroundedChatReply({ text, store, intel, intent, sentiment, liveContext }) {
  const profile = chatProfile(store, intel);
  const label = labelForType(profile.businessType).toLowerCase();
  const intro = sentiment === "concerned"
    ? `I hear the pressure. For ${profile.businessName}, a ${label} in ${profile.city}, I would keep this practical:`
    : `For ${profile.businessName}, a ${label} in ${profile.city}, here is the practical answer:`;
  if (intent === "product") return productChatReply({ intro, liveContext, profile });
  if (intent === "web" || (intent === "general" && liveContext?.lookup)) return webLookupChatReply({ intro, liveContext, profile });
  if (intent === "news") return newsChatReply({ intro, liveContext, profile });
  if (intent === "weather") return weatherChatReply({ intro, intel, profile });
  if (intent === "reviews") return reviewsChatReply({ intro, intel, profile });
  if (intent === "footfall") return footfallChatReply({ intro, intel, profile });
  if (intent === "risk") return riskChatReply({ intro, intel, profile });
  if (intent === "compliance") return complianceChatReply({ intro, intel, profile });
  if (intent === "competitors") return competitorChatReply({ intro, intel, profile });
  return profitChatReply({ intro, intel, profile, text });
}

function webLookupChatReply({ intro, liveContext, profile }) {
  const lookup = liveContext?.lookup || {};
  const places = lookup.places?.places || [];
  const web = lookup.web || {};
  const articles = uniqueArticles([...(web.articles || []), ...(web.news || [])]).slice(0, 4);
  const subject = lookup.query || "that";
  const preferWebSummary = /\b(what is|who is|define|explain)\b/i.test(lookup.question || "") && (web.wikipedia?.title || web.abstract || articles.length);
  if (places.length && !preferWebSummary) {
    const rows = places.slice(0, 5).map((place) => {
      const rating = place.rating ? `${place.rating}★${place.reviews ? ` / ${formatCompactNumber(place.reviews)} reviews` : ""}` : "not listed";
      const action = place.url ? `[Open map](${place.url})` : (place.website ? `[Website](${place.website})` : "verify live");
      return `| ${markdownTableCell(place.name)} | ${markdownTableCell(place.category || "business")} | ${markdownTableCell(rating)} | ${markdownTableCell(place.address || profile.city)} | ${action} |`;
    });
    const best = places[0];
    return [
      intro,
      "",
      `I looked up **${subject}** and found live local/place results. Use this as a business signal, not a final legal or purchasing source.`,
      "",
      "| Result | Type | Public signal | Location | Link |",
      "|---|---|---|---|---|",
      ...rows,
      "",
      `Owner read: ${best?.name ? `if ${best.name} overlaps your customers, compare their photos, menu clarity, hours and review themes before choosing your next offer.` : "compare the best-matching result against your photos, menu clarity and hours."}`
    ].join("\n");
  }
  if (web.wikipedia?.title || web.abstract || articles.length) {
    const sourceRows = [];
    if (web.wikipedia?.title) sourceRows.push(`| ${markdownTableCell(web.wikipedia.title)} | ${markdownTableCell(web.wikipedia.extract || "summary")} | ${web.wikipedia.url ? `[Open](${web.wikipedia.url})` : "source"} |`);
    if (web.abstract) sourceRows.push(`| Web summary | ${markdownTableCell(web.abstract)} | ${web.abstractUrl ? `[Open](${web.abstractUrl})` : "source"} |`);
    for (const article of articles) {
      sourceRows.push(`| ${markdownTableCell(article.domain || "web")} | ${markdownTableCell(article.title)} | ${article.url ? `[Open](${article.url})` : "source"} |`);
    }
    const closing = preferWebSummary
      ? `Quick read: this is general web context. If it affects ${profile.businessName}, ask me how it changes payments, pricing, risk, or customer demand.`
      : `Business use: translate this into one practical move for ${profile.businessName}: improve your listing clarity, compare the offer, or use the event/news angle only if it affects customers near ${profile.city}.`;
    return [
      intro,
      "",
      `I found public web signals for **${subject}**:`,
      "",
      "| Source | What it says | Link |",
      "|---|---|---|",
      ...sourceRows.slice(0, 6),
      "",
      closing
    ].join("\n");
  }
  return [
    intro,
    "",
    `I could not verify a strong public source for **${subject}** in the quick lookup. I would not invent details, but here are the fastest live checks.`,
    "",
    "| Next check | Why it matters | Link |",
    "|---|---|---|",
    `| Google Maps | Confirms address, hours, reviews and photos | [Open](${googleMapsSearchUrl(`${subject} ${profile.city || ""}`, profile)}) |`,
    `| Google Search | Finds official site, menu, social page and photos | [Open](${googleSearchUrl(`${subject} ${profile.city || ""}`)}) |`,
    `| Local news search | Shows whether anything current affects demand | [Open](${googleNewsLookupUrl(`${subject} ${profile.city || ""}`)}) |`,
    "",
    "Owner move: do not act on an unverified name. Ask me with a city, address, or website and I will narrow it down."
  ].join("\n");
}

function googleSearchUrl(query) {
  return `https://www.google.com/search?${new URLSearchParams({ q: String(query || "").trim() })}`;
}

function googleNewsLookupUrl(query) {
  return `https://news.google.com/search?${new URLSearchParams({ q: String(query || "").trim(), hl: "en-US", gl: "US", ceid: "US:en" })}`;
}

function productChatReply({ intro, liveContext, profile }) {
  const product = liveContext?.product;
  if (!product?.options?.length) {
    return [
      intro,
      "",
      "| Supplier | Best use | Price | Timing | Action |",
      "|---|---|---|---|---|",
      `| Local pickup | Same-day emergency in ${markdownTableCell(profile.city)} | Check live | Today if nearby | Search Google Maps or call nearby groceries |`,
      "| Costco / Business Center | Bulk produce or pantry items | Check live | Same day if pickup | Compare unit price before buying |",
      "| Restaurant supply store | Larger case quantities | Check live | Pickup or delivery varies | Confirm freshness and minimum order |",
      "",
      "Owner call: if you need it for today's service, prioritize pickup and freshness over the lowest price."
    ].join("\n");
  }
  const rows = product.options.slice(0, 5).map((item, index) => {
    const price = item.price || "check live price";
    const timing = [item.stock, item.eta].filter(Boolean).join(" / ") || "confirm stock";
    return `| ${markdownTableCell(item.providerName || item.provider || `Option ${index + 1}`)} | ${markdownTableCell(item.title)} | ${markdownTableCell(price)} | ${markdownTableCell(timing)} | ${item.url ? `[View / buy](${item.url})` : "Check supplier"} |`;
  });
  return [
    intro,
    "",
    `I found supplier options for **${product.query}**. For same-day needs near ${profile.city}, prefer rows that mention pickup; for planned buys, compare unit price and reviews.`,
    "",
    "| Supplier | Product | Price | Timing | Action |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "My call: open the top two links, confirm live stock, then buy the cheapest unit price only if delivery/pickup timing protects the next rush."
  ].join("\n");
}

function markdownTableCell(value) {
  return String(value || "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function newsChatReply({ intro, liveContext, profile }) {
  const articles = uniqueArticles([...(liveContext?.news?.articles || []), ...(liveContext?.events?.articles || [])]).slice(0, 5);
  if (!articles.length) {
    return `${intro}\n\nI did not find a strong local news/event item in the quick scan. Use the normal plan: update your Google listing, push one visible offer, and ask the assistant again after refresh if you want a wider local scan.`;
  }
  const rows = articles.map((article, index) => `${index + 1}. ${article.title} (${article.domain || "local source"})${article.url ? `\n   ${article.url}` : ""}`);
  return [
    intro,
    "",
    `Here is what I found around ${profile.city} that could affect foot traffic or demand:`,
    ...rows,
    "",
    "Business move: only act if the audience overlaps your customers. If yes, prep one fast-selling item, post a simple offer, and keep extra packaging ready."
  ].join("\n");
}

function weatherChatReply({ intro, intel, profile }) {
  const days = (intel?.weatherForecast || []).slice(0, 4);
  const rows = days.map((day, index) => `${index + 1}. ${day.day || day.date}: ${day.condition || "forecast"}, high ${day.highF ?? "?"}F, rain ${day.rainProbability ?? "?"}%, wind ${day.windMph ?? "?"}mph.`);
  const rain = Math.max(0, ...days.map((day) => Number(day.rainProbability)).filter(Number.isFinite));
  const heat = Math.max(0, ...days.map((day) => Number(day.highF)).filter(Number.isFinite));
  const move = rain >= 45
    ? "Push pickup/delivery, check takeout packaging, and avoid over-prepping walk-up-only items."
    : heat >= 82
      ? "Feature cold drinks, fast handheld items, and shade-friendly signage before afternoon traffic."
      : "Use normal prep, then put your best offer outside before the busiest window.";
  return [intro, "", ...rows, "", `Owner move: **${move}**`].join("\n");
}

function reviewsChatReply({ intro, intel, profile }) {
  const mi = intel?.marketIntelligence || {};
  const topTheme = mi.topReviewTags?.[0]?.title || "speed, taste, or friendliness";
  const avg = mi.avgRating ? `${Number(mi.avgRating).toFixed(1)} stars nearby` : "nearby ratings are still loading";
  return [
    intro,
    "",
    `Nearby benchmark: ${avg}. Use one specific prompt tied to what customers liked: **${topTheme}**.`,
    "1. Ask right after the customer smiles or compliments the food.",
    "2. Say: “If that helped, could you mention the tacos/service in a Google review? It helps people nearby find us.”",
    "3. Put the QR code on the receipt window, not just inside the truck.",
    "4. Reply to every review within 24 hours; mention the item they bought if they named it."
  ].join("\n");
}

function footfallChatReply({ intro, intel, profile }) {
  const mi = intel?.marketIntelligence || {};
  const peak = mi.busyHeatmap?.peakDay ? `${mi.busyHeatmap.peakDay} ${chatHourLabel(mi.busyHeatmap.peakHour)}` : "your next visible rush";
  const busy = mi.busyHeatmap?.peakValue ? `about ${Math.round(mi.busyHeatmap.peakValue)}% busy nearby` : "busy-window data is still loading";
  return [
    intro,
    "",
    `Best window: **${peak}** (${busy}).`,
    "1. Put one easy-to-read offer outside 45 minutes before that window.",
    "2. Make the offer a fast item, not a complicated discount.",
    "3. Update Google photos/menu before the window so nearby searchers trust you.",
    "4. Ask the assistant for a 1-day promo draft if you want copy."
  ].join("\n");
}

function riskChatReply({ intro, intel }) {
  const warnings = (intel?.warnings || []).filter((item) => item.urgency !== "Low").slice(0, 4);
  if (!warnings.length) return `${intro}\n\nNo urgent warning is loaded right now. Biggest controllable risks are stockouts, slow service during peak, and missing review follow-up.`;
  return [intro, "", ...warnings.map((item, index) => `${index + 1}. **${item.title}** — ${item.action || item.why || "Review before the next shift."}`)].join("\n");
}

function complianceChatReply({ intro, intel, profile }) {
  const docs = (intel?.compliance || intel?.licenseChecklist || []).slice(0, 6);
  if (!docs.length) return `${intro}\n\nI do not have the checklist loaded yet. For a ${labelForType(profile.businessType).toLowerCase()} in ${profile.city}, ask again after scan and I will cite the exact documents.`;
  return [intro, "", "Keep these current first:", ...docs.map((item, index) => `${index + 1}. ${item.name} (${item.authority || "authority"})${item.url ? ` — ${item.url}` : ""}`)].join("\n");
}

function competitorChatReply({ intro, intel }) {
  const places = (intel?.nearbyPlaces || intel?.marketPlaces || []).slice(0, 5);
  const mi = intel?.marketIntelligence || {};
  const rows = places.map((place, index) => `${index + 1}. ${place.name} — ${place.rating || "?"} stars, ${formatCompactNumber(place.reviews || 0)} reviews${place.price ? `, ${place.price}` : ""}.`);
  return [
    intro,
    "",
    rows.length ? "Compare against these visible nearby places:" : "Nearby competitor names are still loading.",
    ...rows,
    "",
    mi.avgRating ? `The block average is ${Number(mi.avgRating).toFixed(1)} stars, so the quickest win is clearer photos/menu plus one obvious high-margin offer.` : "Quickest win: clearer photos/menu plus one obvious high-margin offer."
  ].join("\n");
}

function profitChatReply({ intro, intel, profile }) {
  const opportunities = (intel?.opportunities || []).slice(0, 3);
  const mi = intel?.marketIntelligence || {};
  const peak = mi.busyHeatmap?.peakDay ? `${mi.busyHeatmap.peakDay} ${chatHourLabel(mi.busyHeatmap.peakHour)}` : "the next rush";
  const rows = opportunities.length
    ? opportunities.map((item, index) => `${index + 1}. **${item.title}** — ${item.action || item.why || "Turn this into one owner task."}`)
    : [
      "1. Pick one high-margin item and make it the easiest thing to order.",
      "2. Prep for the next rush, not the whole day.",
      "3. Ask every happy customer for one Google review while the food is fresh."
    ];
  return [
    intro,
    "",
    `My profit answer: focus on **one fast high-margin offer before ${peak}**.`,
    ...rows,
    "",
    `For a ${labelForType(profile.businessType).toLowerCase()}, do not discount the whole menu. Discount only the item that brings people in, then upsell the add-on.`
  ].join("\n");
}

function uniqueArticles(articles = []) {
  const seen = new Set();
  const out = [];
  for (const article of articles) {
    const key = String(article.url || article.title || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(article);
  }
  return out;
}

function chatHourLabel(hour) {
  const h = Number(hour);
  if (!Number.isFinite(h)) return "peak time";
  const suffix = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 || 12;
  return `${hour12}${suffix}`;
}

async function callGeminiChat({ model, system, messages }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1200
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        ok: false,
        fallback: true,
        error: `Gemini ${response.status}: ${errText.slice(0, 240)}`
      };
    }
    const data = await response.json();
    const reply = (data.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();
    return {
      ok: true,
      reply: reply || "I didn't have anything to add — try asking about warnings, opportunities, competitors, permits, or delegated actions.",
      model,
      usage: data.usageMetadata || null,
      provider: "gemini"
    };
  } catch (error) {
    return {
      ok: false,
      fallback: true,
      error: `Gemini call failed: ${error.message}`
    };
  }
}

const TRANSLATION_TARGETS = {
  es: "Spanish",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
  fil: "Filipino"
};
const TRANSLATION_CACHE = new Map();

async function handleTranslate(body = {}) {
  const lang = String(body.lang || "").toLowerCase();
  const targetLanguage = TRANSLATION_TARGETS[lang];
  if (!targetLanguage) {
    return { ok: true, lang: "en", provider: "local", translations: {} };
  }

  const unique = [];
  const seen = new Set();
  for (const value of Array.isArray(body.strings) ? body.strings : []) {
    const text = sanitizeTranslationString(value);
    if (!shouldTranslateServerSide(text) || seen.has(text)) continue;
    seen.add(text);
    unique.push(text);
    if (unique.length >= 80) break;
  }

  const translations = {};
  const missing = [];
  for (const text of unique) {
    const cacheKey = `${lang}\u0000${text}`;
    if (TRANSLATION_CACHE.has(cacheKey)) {
      translations[text] = TRANSLATION_CACHE.get(cacheKey);
    } else {
      missing.push(text);
    }
  }

  let provider = "cache";
  if (missing.length && process.env.GEMINI_API_KEY) {
    provider = "gemini";
    const generated = await callGeminiTranslate({ strings: missing, lang, targetLanguage });
    for (const [source, translated] of Object.entries(generated)) {
      const clean = sanitizeTranslationString(translated);
      if (!clean) continue;
      TRANSLATION_CACHE.set(`${lang}\u0000${source}`, clean);
      translations[source] = clean;
    }
  } else if (missing.length) {
    provider = "local";
  }

  return { ok: true, lang, provider, translations };
}

function sanitizeTranslationString(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function shouldTranslateServerSide(text) {
  if (!text || text.length < 2 || text.length > 360) return false;
  if (/^https?:\/\//i.test(text) || /^[\w.-]+@[\w.-]+\.\w+$/.test(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^[\d\s.,:$%/#+\-–—()]+$/.test(text)) return false;
  if (/^(PDF|AI|API|URL|CSV|OK)$/i.test(text)) return false;
  return true;
}

async function callGeminiTranslate({ strings, lang, targetLanguage }) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const items = strings.map((text, index) => ({ id: String(index), text }));
  const system = [
    `Translate small-business dashboard UI strings into ${targetLanguage}.`,
    "Return only strict JSON: an object whose keys are item ids and values are translated strings.",
    "Preserve brand names, business names, people names, addresses, URLs, emails, coupon codes, product names, prices, dates, and numbers.",
    "Do not add explanations. Keep the same meaning, tone, and rough length."
  ].join(" ");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{
          role: "user",
          parts: [{ text: JSON.stringify({ lang, targetLanguage, items }) }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 6000
        }
      })
    });
    if (!response.ok) return {};
    const data = await response.json();
    const text = (data.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();
    const parsed = parseJsonObject(text);
    const translations = {};
    for (const item of items) {
      const translated = parsed?.[item.id];
      if (typeof translated === "string" && translated.trim()) translations[item.text] = translated.trim();
    }
    return translations;
  } catch {
    return {};
  }
}

function parseJsonObject(text) {
  const clean = String(text || "").trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try { return JSON.parse(clean.slice(start, end + 1)); } catch { return null; }
  }
}

function buildChatSystemPrompt(store, intel) {
  const lines = [];
  const storeName = store.businessName || "this storefront";
  const storeType = labelForType(store.businessType || "retail").toLowerCase();
  const storeCity = store.city || (intel?.profile?.city) || "your city";
  const storeAddress = store.address || (intel?.profile?.locationLabel) || "";
  const storeState = store.state || "CA";
  const storeNeighborhood = (intel?.marketPlaces || []).map((p) => p.neighborhood).filter(Boolean)[0] || "";

  lines.push(`You are Righthand AI, an expert small-business advisor for ${storeName} — a ${storeType} ${storeAddress ? `at ${storeAddress}` : ""} in ${storeCity}, ${storeState}${storeNeighborhood ? ` (${storeNeighborhood} neighborhood)` : ""}.`);
  lines.push("");
  lines.push("CRITICAL RULES — FOLLOW EVERY TIME:");
  lines.push(`1. Every answer must be ANCHORED to ${storeName}'s specific location and business type. Reference "${storeCity}" and "${storeType}" naturally. Never give generic boilerplate.`);
  lines.push("2. When the LIVE INTEL block contains a relevant data point (price tier of nearby places, review themes, weather forecast, peak busy time, warnings, opportunities, nearby competitors, compliance docs), CITE IT directly with the actual numbers and names. That's our edge over generic AI.");
  lines.push("3. When asked about competitors, name them from NEARBY PLACES below, not generic ones. When asked about permits/licenses/documents, use the COMPLIANCE block below with its evidence URLs — link to the actual gov pages.");
  lines.push("4. For anything not in the intel, use your general business knowledge confidently — but still tailor to a " + storeType + " in " + storeCity + ".");
  lines.push("5. Don't INVENT specific facts about THIS store (its sales, its actual reviews, its inspection history) that aren't in the profile or intel. General industry benchmarks are fine.");
  lines.push("6. Format: short paragraphs or numbered lists. Use **bold** for the punchline. 150–400 words depending on complexity.");
  lines.push("7. Never refuse a shop-related question. If a question is genuinely off-topic (politics, personal therapy, unrelated code review), gently redirect to storefront topics.");
  lines.push("");
  lines.push("ACTIVE STORE PROFILE:");
  lines.push(`- Name: ${storeName}`);
  lines.push(`- Type: ${storeType}`);
  lines.push(`- Address: ${storeAddress || "(not set)"}`);
  lines.push(`- City / State: ${storeCity}, ${storeState}`);
  if (storeNeighborhood) lines.push(`- Neighborhood: ${storeNeighborhood}`);
  if (intel?.profile?.lat && intel?.profile?.lon) lines.push(`- Coordinates: ${Number(intel.profile.lat).toFixed(4)}, ${Number(intel.profile.lon).toFixed(4)}`);
  if (intel?.profile?.cityScopeLabel) lines.push(`- Monitoring scope: ${intel.profile.cityScopeLabel}`);
  if (store.avgTicket) lines.push(`- Average ticket: ${store.avgTicket}`);
  if (store.fullTimeStaff || store.partTimeStaff) lines.push(`- Staff: ${store.fullTimeStaff || "?"} FT, ${store.partTimeStaff || "?"} PT`);
  if (store.dailyRevenue) lines.push(`- Typical daily revenue: ${store.dailyRevenue}`);
  if (store.inventoryValue) lines.push(`- At-risk inventory: ${store.inventoryValue}`);
  if (store.suppliers) lines.push(`- Key suppliers: ${store.suppliers}`);
  if (store.licenseNotes) lines.push(`- License notes: ${store.licenseNotes}`);
  if (store.insuranceCarrier) lines.push(`- Insurance carrier: ${store.insuranceCarrier}`);
  if (store.backupPower) lines.push(`- Backup power: ${store.backupPower}`);
  if (store.storeNotes) lines.push(`- Owner notes: ${store.storeNotes}`);
  lines.push("");

  if (!intel) {
    lines.push("LIVE INTEL: not yet loaded for this scan. Answer using general knowledge tailored to a " + storeType + " in " + storeCity + ". If the question needs specific local data (weather, competitors, warnings, pricing), say the city scan hasn't completed but still give a useful general answer.");
    return lines.join("\n");
  }

  lines.push(`=== LIVE INTEL (scanned ${intel.generatedAt || "recently"} for ${storeCity}) ===`);

  if (Array.isArray(intel.warnings) && intel.warnings.length) {
    lines.push("");
    lines.push(`WARNINGS (${intel.warnings.length}):`);
    for (const w of intel.warnings.slice(0, 6)) {
      lines.push(`- [${w.urgency || "Medium"}] ${w.title} — ${w.action || w.why || ""}`);
    }
  }

  if (Array.isArray(intel.opportunities) && intel.opportunities.length) {
    lines.push("");
    lines.push(`OPPORTUNITIES (${intel.opportunities.length}):`);
    for (const o of intel.opportunities.slice(0, 6)) {
      lines.push(`- ${o.title} — ${o.action || o.why || ""}`);
    }
  }

  if (Array.isArray(intel.weatherForecast) && intel.weatherForecast.length) {
    lines.push("");
    lines.push(`WEATHER NEAR ${storeCity.toUpperCase()} (next 3 days):`);
    for (const d of intel.weatherForecast.slice(0, 3)) {
      lines.push(`- ${d.day || d.date}: ${d.condition || ""}, high ${d.highF ?? "?"}F / low ${d.lowF ?? "?"}F, rain ${d.rainProbability ?? "?"}%, wind ${d.windMph ?? "?"}mph`);
    }
  }

  const mi = intel.marketIntelligence;
  if (mi) {
    lines.push("");
    lines.push(`MARKET INTELLIGENCE (Apify Google Places scan, ${mi.competitorsAnalyzed || 0} competitors near ${storeName}):`);
    if (mi.dominantTierLabel) lines.push(`- Dominant price tier on this block: ${mi.dominantTierLabel} (${mi.priceDistribution?.find((p) => p.tier === mi.dominantTier)?.pct || 0}%)`);
    if (mi.avgRating) lines.push(`- Block average rating: ${mi.avgRating.toFixed ? mi.avgRating.toFixed(1) : mi.avgRating}★`);
    if (mi.busyHeatmap?.peakDay) lines.push(`- Block peak demand: ${mi.busyHeatmap.peakDay} ${mi.busyHeatmap.peakHour}:00 (~${mi.busyHeatmap.peakValue}% busy across ${mi.busyHeatmap.contributing} places)`);
    if (Array.isArray(mi.topReviewTags) && mi.topReviewTags.length) {
      lines.push(`- Top review themes on this block: ${mi.topReviewTags.slice(0, 8).map((t) => `${t.title} (${t.places} places)`).join(", ")}`);
    }
    if (Array.isArray(mi.topRated) && mi.topRated.length) {
      lines.push(`- Top-rated nearby: ${mi.topRated.map((r) => `${r.name} ${r.rating?.toFixed?.(1) || ""}★`).join(", ")}`);
    }
    if (mi.categoryBreakdown?.entries?.length) {
      lines.push(`- Category mix: ${mi.categoryBreakdown.entries.slice(0, 4).map((e) => `${e.label} ${e.pct}%`).join(", ")}`);
    }
    if (mi.hoursCoverage?.contributing) {
      lines.push(`- Hours coverage: ${mi.hoursCoverage.openEarlyCount || 0} places open before 8am, ${mi.hoursCoverage.openLateCount || 0} past 9pm, ${mi.hoursCoverage.open24Count || 0} open 24h`);
    }
    if (Array.isArray(mi.recommendations) && mi.recommendations.length) {
      lines.push("");
      lines.push("DATA-BACKED RECOMMENDATIONS (already shown to the owner):");
      for (const r of mi.recommendations) {
        lines.push(`- ${r.title} → ${r.action}`);
      }
    }
  }

  if (Array.isArray(intel.nearbyPlaces) && intel.nearbyPlaces.length) {
    lines.push("");
    lines.push(`NEARBY PLACES (specific competitors near ${storeName}):`);
    for (const p of intel.nearbyPlaces.slice(0, 8)) {
      const bits = [p.name];
      if (p.category) bits.push(p.category);
      if (p.rating) bits.push(`${p.rating}★ (${p.reviews || 0} reviews)`);
      if (p.price) bits.push(p.price);
      if (p.address) bits.push(p.address);
      lines.push(`- ${bits.join(" · ")}`);
    }
    lines.push("USE THESE NAMES when the user asks about competitors, who's nearby, or who to compare against.");
  }

  if (Array.isArray(intel.compliance) && intel.compliance.length) {
    lines.push("");
    lines.push(`COMPLIANCE & DOCUMENTS for this ${storeType} in ${storeCity} (cite the URL when answering permit/license questions):`);
    const byCat = new Map();
    for (const c of intel.compliance) {
      const k = c.category || "other";
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k).push(c);
    }
    for (const [cat, items] of byCat) {
      lines.push(`  [${cat}]`);
      for (const c of items.slice(0, 6)) {
        const url = c.url ? ` ${c.url}` : "";
        lines.push(`  - [${c.priority}] ${c.name} (${c.authority})${url}`);
      }
    }
  }

  lines.push("");
  lines.push(`Reminder: anchor every answer to ${storeName} in ${storeCity}. Cite specific numbers, competitor names, and gov URLs from the LIVE INTEL above.`);

  return lines.join("\n");
}

const APIFY_PRODUCTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COMMONS_IMAGES_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchApifyProducts(query, businessType) {
  if (!process.env.APIFY_TOKEN || process.env.APIFY_PRODUCTS_DISABLED === "1") return null;
  const actorId = process.env.APIFY_PRODUCTS_ACTOR || "axesso_data/amazon-search-scraper";
  const max = Number(process.env.APIFY_PRODUCTS_MAX || 6);
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return null;

  const cacheKey = `${actorId}|${cleanQuery.toLowerCase()}|${normalizeType(businessType)}|${max}`;
  const cached = APIFY_PRODUCTS_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < APIFY_PRODUCTS_TTL_MS) return cached.payload;

  const input = buildProductsActorInput(actorId, cleanQuery, max);
  const result = await runApifyActor(actorId, input, 180000);
  if (!result.ok || !Array.isArray(result.items) || !result.items.length) {
    return null;
  }
  const products = result.items.slice(0, max).map((p) => normalizeProduct(p)).filter((p) => p.title && p.image);
  if (!products.length) return null;
  const payload = { products, query: cleanQuery, actorId, count: products.length };
  APIFY_PRODUCTS_CACHE.set(cacheKey, { at: Date.now(), payload });
  persistProductsCache();
  return payload;
}

function buildProductsActorInput(actorId, query, max) {
  // Each Apify product actor wants a slightly different input shape — handle the
  // common ones explicitly. For unknown actors fall back to a generic search payload.
  if (actorId.includes("junglee") || actorId === "junglee/amazon-crawler") {
    return {
      categoryOrProductUrls: [{ url: `https://www.amazon.com/s?k=${encodeURIComponent(query).replace(/%20/g, "+")}` }],
      maxItemsPerStartUrl: max,
      proxyConfiguration: { useApifyProxy: true },
      scrapeProductDetails: false
    };
  }
  if (actorId.includes("amazon")) {
    return {
      keyword: query,
      keywords: [query],
      searchTerms: [query],
      domainCode: "com",
      countryCode: "US",
      sortBy: "featured",
      maxItemsPerStartUrl: max,
      maxResults: max,
      maxItems: max,
      pages: 1,
      maxPagesPerStartUrl: 1
    };
  }
  if (actorId.includes("google-shopping")) {
    return { queries: [query], maxItemsPerQuery: max, country: "US", language: "en" };
  }
  if (actorId.includes("walmart")) {
    return { queries: [query], maxItems: max };
  }
  return { searchTerms: [query], maxItems: max, query };
}

function normalizeProduct(raw) {
  if (!raw || typeof raw !== "object") return { title: "", image: "" };
  const title = raw.title || raw.name || raw.productName || raw.itemTitle || "";
  const image =
    raw.image ||
    raw.imageUrl ||
    raw.thumbnail ||
    raw.thumbnailImage ||
    raw.mainImage ||
    (Array.isArray(raw.highResolutionImages) ? raw.highResolutionImages[0] : "") ||
    (Array.isArray(raw.galleryThumbnails) ? raw.galleryThumbnails[0] : "") ||
    (Array.isArray(raw.images) ? raw.images[0] : "") ||
    "";
  const priceRaw = raw.price || raw.priceWithCurrency || raw.priceText || raw.currentPrice || raw.salePrice || "";
  let price = "";
  let priceNumber = null;
  if (typeof priceRaw === "string") {
    price = priceRaw.trim();
    const m = price.match(/[\d,.]+/);
    priceNumber = m ? Number(m[0].replace(/,/g, "")) : null;
  } else if (priceRaw && typeof priceRaw === "object") {
    const v = Number(priceRaw.value ?? priceRaw.amount ?? priceRaw.current);
    const cur = priceRaw.currency || priceRaw.currencyCode || "$";
    if (Number.isFinite(v)) {
      priceNumber = v;
      price = `${cur}${v.toFixed(2)}`;
    } else {
      price = String(priceRaw.displayString || priceRaw.text || priceRaw.label || "").trim();
    }
  } else if (typeof priceRaw === "number") {
    priceNumber = priceRaw;
    price = `$${priceRaw.toFixed(2)}`;
  }
  if (!price && Number.isFinite(priceNumber)) price = `$${priceNumber.toFixed(2)}`;
  // junglee/amazon-crawler returns price as { value, currency } — handle that.
  if (!price && raw.price && typeof raw.price === "object") {
    const v = Number(raw.price.value);
    if (Number.isFinite(v)) {
      priceNumber = v;
      price = `${raw.price.currency || "$"}${v.toFixed(2)}`;
    }
  }
  return {
    title: String(title).trim(),
    image: String(image).trim(),
    price: price || "Live price",
    priceNumber: Number.isFinite(priceNumber) ? priceNumber : null,
    rating: Number(raw.stars ?? raw.rating ?? raw.averageRating) || null,
    reviewsCount: Number(raw.reviewsCount ?? raw.numberOfReviews ?? raw.totalReviews ?? (typeof raw.reviews === "number" ? raw.reviews : 0)) || 0,
    url: raw.url || raw.link || raw.detailUrl || raw.productUrl || "",
    asin: raw.asin || raw.sku || raw.itemId || "",
    seller: raw.brand || raw.seller || raw.merchant || ""
  };
}

async function buildRestockComparison(profile, params) {
  const query = String(params.get("q") || params.get("query") || "").replace(/\s+/g, " ").trim();
  const businessType = normalizeType(profile.businessType || params.get("businessType") || "retail");
  const storeName = profile.businessName || "this store";
  const directCategory = matchRestockCategory(query);
  const category = directCategory || defaultRestockCategory(businessType);
  const searchText = query || category.search;
  const isCustomSearch = Boolean(query && !shouldUseCatalogRestockRows(query, directCategory));
  const baseOptions = (isCustomSearch
    ? customRestockOptions(searchText, businessType)
    : category.options.map((option) => restockOption(option, category, searchText, businessType)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

  // Live product enrichment via Apify — pulls real product images, prices, ratings.
  // Works for any storefront type because it scrapes a generic product search.
  let liveProducts = null;
  try {
    liveProducts = await fetchApifyProducts(searchText, businessType);
  } catch (error) {
    liveProducts = null;
  }
  const preloadedImages = preloadedProductImages(searchText);
  let fallbackImages = preloadedImages;
  if (!liveProducts?.products?.some((product) => product?.image)) {
    if (!fallbackImages?.length) {
      try {
        fallbackImages = await fetchCommonsImages(searchText);
      } catch (error) {
        fallbackImages = null;
      }
    }
  }

  const options = enrichRestockOptionsWithProductImages(baseOptions, liveProducts?.products, fallbackImages);

  return {
    ok: true,
    query: searchText,
    category: isCustomSearch ? "custom" : category.id,
    storeName,
    businessType,
    generatedAt: new Date().toISOString(),
    mode: isCustomSearch ? "custom-supplier-search" : process.env.APIFY_TOKEN ? "provider-ready" : "supplier-search",
    note: isCustomSearch
      ? "Custom search estimates: use these top supplier rows to compare likely price, pack size, demand signal and live purchase pages."
      : process.env.APIFY_TOKEN
        ? "Ready for live provider enrichment through Apify actors."
        : "Prices and review counts are comparison estimates. Open supplier links to confirm live price, stock, shipping and purchase.",
    summary: isCustomSearch ? customRestockSummary(searchText, options, profile) : restockSummary(searchText, category, options, profile),
    providers: RESTOCK_PROVIDERS.map((provider) => ({
      id: provider.id,
      name: provider.name,
      domain: provider.domain,
      url: provider.url(searchText)
    })),
    suggestions: restockSuggestionsForType(businessType),
    options,
    liveProducts: liveProducts ? {
      count: liveProducts.products.length,
      actorId: liveProducts.actorId,
      query: liveProducts.query,
      products: liveProducts.products,
      comparison: buildProductComparison(liveProducts.products)
    } : null
  };
}

function shouldUseCatalogRestockRows(query, category) {
  if (!query || !category) return false;
  const text = String(query).toLowerCase().replace(/\s+/g, " ").trim();
  return category.terms.some((term) => text === term);
}

function preloadedProductImages(query) {
  const cleanQuery = String(query || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!cleanQuery) return null;
  const matchedSet = PRELOADED_PRODUCT_IMAGE_SETS.find((set) =>
    set.aliases.some((alias) => phraseMatches(cleanQuery, alias))
  );
  if (!matchedSet) return null;
  return matchedSet.images.map((image, index) => ({
    ...image,
    source: "Preloaded Wikimedia Commons",
    sourceType: "preloaded",
    index,
    score: 100 - index
  }));
}

function phraseMatches(text, phrase) {
  const cleanPhrase = String(phrase || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!cleanPhrase) return false;
  const escaped = cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

async function fetchCommonsImages(query) {
  if (process.env.COMMONS_IMAGES_DISABLED === "1") return null;
  const cleanQuery = String(query || "").replace(/\s+/g, " ").trim();
  if (!cleanQuery) return null;
  const cacheKey = cleanQuery.toLowerCase();
  const cached = COMMONS_IMAGE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < COMMONS_IMAGES_TTL_MS) return cached.payload;

  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${cleanQuery} product filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url|mime|size",
    iiurlwidth: "240",
    format: "json",
    origin: "*"
  });
  const data = await fetchJson(url, { headers: { "User-Agent": APP_USER_AGENT } }, 7000);
  const pages = Object.values(data?.query?.pages || {});
  const images = pages
    .map((page) => normalizeCommonsImage(page, cleanQuery))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 5);
  const payload = images.length ? images : null;
  COMMONS_IMAGE_CACHE.set(cacheKey, { at: Date.now(), payload });
  return payload;
}

function normalizeCommonsImage(page, query) {
  const info = page?.imageinfo?.[0];
  const image = info?.thumburl || info?.url || "";
  if (!image || !/^image\//i.test(info?.mime || "")) return null;
  const title = String(page.title || "").replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  const score = commonsImageScore(title, query);
  if (score < 2) return null;
  return {
    title,
    image,
    url: info.descriptionurl || "",
    source: "Wikimedia Commons",
    index: Number(page.index || 999),
    score
  };
}

function commonsImageScore(title, query) {
  const cleanTitle = String(title || "").toLowerCase();
  const words = queryWords(query);
  let score = 0;
  if (cleanTitle.includes(String(query || "").toLowerCase())) score += 5;
  for (const word of words) {
    const variants = new Set([word, singularize(word), pluralize(word)]);
    if ([...variants].some((variant) => variant && cleanTitle.includes(variant))) score += 2;
  }
  if (/\b(pair|store|shop|sold|product|chair|shoe|recliner|table|shelf|rack|glove|container|cup|roll|paper|bag)\b/i.test(cleanTitle)) score += 1;
  if (/\b(person|people|man|woman|child|workshop|repairing|event|street|statue|painting|screenshot|game)\b/i.test(cleanTitle)) score -= 3;
  if (/\b(product photography)\b/i.test(cleanTitle)) score -= 4;
  return score;
}

function queryWords(value) {
  const stopWords = new Set(["best", "selling", "commercial", "business", "grade", "bulk", "pack", "case", "count", "item", "option", "product"]);
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function singularize(word) {
  return String(word || "").replace(/ies$/i, "y").replace(/s$/i, "");
}

function pluralize(word) {
  const clean = String(word || "");
  if (!clean || clean.endsWith("s")) return clean;
  return clean.endsWith("y") ? `${clean.slice(0, -1)}ies` : `${clean}s`;
}

function enrichRestockOptionsWithProductImages(options, products, commonsImages) {
  if (!Array.isArray(options)) return options;
  const withImages = Array.isArray(products) ? products.filter((product) => product?.image) : [];
  const openImages = Array.isArray(commonsImages) ? commonsImages.filter((image) => image?.image) : [];
  if (!withImages.length && !openImages.length) return options;
  return options.map((option, index) => {
    if (option.imageSource === "supplier") return option;
    const product = withImages[index % withImages.length] || null;
    const openImage = openImages[index % openImages.length] || null;
    return {
      ...option,
      image: product?.image || openImage?.image || option.image,
      imageSource: product?.image ? "apify" : (openImage?.sourceType || "commons"),
      liveProductTitle: product?.title || "",
      liveProductUrl: product?.url || "",
      imageCredit: openImage?.source || "",
      imageCreditUrl: openImage?.url || "",
      imageCreditTitle: openImage?.title || ""
    };
  });
}

function buildProductComparison(products) {
  if (!Array.isArray(products) || products.length === 0) return null;
  const priced = products.filter((p) => Number.isFinite(p.priceNumber));
  const rated = products.filter((p) => Number.isFinite(p.rating) && p.rating > 0);
  const reviewed = products.filter((p) => Number(p.reviewsCount) > 0);
  const cheapest = priced.length ? priced.reduce((min, p) => (p.priceNumber < min.priceNumber ? p : min), priced[0]) : null;
  const mostExpensive = priced.length ? priced.reduce((max, p) => (p.priceNumber > max.priceNumber ? p : max), priced[0]) : null;
  const topRated = rated.length ? rated.reduce((best, p) => {
    const score = (p.rating || 0) * Math.log10(Math.max(10, p.reviewsCount || 10));
    const bestScore = (best.rating || 0) * Math.log10(Math.max(10, best.reviewsCount || 10));
    return score > bestScore ? p : best;
  }, rated[0]) : null;
  const mostReviewed = reviewed.length ? reviewed.reduce((max, p) => (p.reviewsCount > max.reviewsCount ? p : max), reviewed[0]) : null;
  const avgPrice = priced.length ? priced.reduce((s, p) => s + p.priceNumber, 0) / priced.length : null;
  const avgRating = rated.length ? rated.reduce((s, p) => s + (p.rating || 0), 0) / rated.length : null;
  return {
    cheapest: cheapest ? { title: cheapest.title, price: cheapest.price, url: cheapest.url, image: cheapest.image } : null,
    mostExpensive: mostExpensive ? { title: mostExpensive.title, price: mostExpensive.price, url: mostExpensive.url, image: mostExpensive.image } : null,
    topRated: topRated ? { title: topRated.title, rating: topRated.rating, reviewsCount: topRated.reviewsCount, url: topRated.url, image: topRated.image } : null,
    mostReviewed: mostReviewed ? { title: mostReviewed.title, reviewsCount: mostReviewed.reviewsCount, rating: mostReviewed.rating, url: mostReviewed.url, image: mostReviewed.image } : null,
    avgPrice: Number.isFinite(avgPrice) ? Number(avgPrice.toFixed(2)) : null,
    avgRating: Number.isFinite(avgRating) ? Number(avgRating.toFixed(2)) : null,
    priceSpread: priced.length >= 2 ? Number((mostExpensive.priceNumber - cheapest.priceNumber).toFixed(2)) : null
  };
}

function matchRestockCategory(query) {
  const text = String(query || "").toLowerCase();
  if (!text) return null;
  const direct = RESTOCK_CATALOG.find((category) => category.terms.some((term) => text.includes(term)));
  if (direct) return direct;
  return null;
}

function defaultRestockCategory(businessType) {
  return RESTOCK_CATALOG.find((category) => category.businessFit.includes(businessType)) || RESTOCK_CATALOG[0];
}

function customRestockOptions(query, businessType) {
  const profile = estimatedProductProfile(query, businessType);
  return [
    { provider: "amazon", title: `${profile.prefix} ${query}`, price: profile.basePrice * 1.03, pack: profile.pack, rating: 4.6, reviews: 5400, salesSignal: "High marketplace review volume", stock: "Multiple sellers", fit: "Fast compare and emergency restock", eta: "Fast shipping varies", score: 88, searchQuery: query },
    { provider: "walmart", title: `${query} pickup option`, price: profile.basePrice * 0.92, pack: profile.smallPack, rating: 4.4, reviews: 1800, salesSignal: "Strong pickup signal", stock: "Pickup may be available", fit: "Same-day local gap coverage", eta: "Pickup / delivery varies", score: 82, searchQuery: query },
    { provider: "target", title: `${query} retail pack`, price: profile.basePrice * 0.88, pack: profile.smallPack, rating: 4.3, reviews: 950, salesSignal: "Local retail review signal", stock: "Pickup may be available", fit: "Small urgent restock", eta: "Pickup / delivery varies", score: 78, searchQuery: query },
    { provider: "costco", title: `Bulk ${query}`, price: profile.basePrice * 1.45, pack: profile.bulkPack, rating: 4.6, reviews: 1200, salesSignal: "Bulk buyer signal", stock: "Membership pricing", fit: "Lower unit cost if volume is high", eta: "Warehouse / delivery varies", score: 76, searchQuery: query },
    { provider: profile.businessProvider, title: `${profile.commercialLabel} ${query}`, price: profile.basePrice * 1.65, pack: profile.bulkPack, rating: 4.5, reviews: 740, salesSignal: "Business supply signal", stock: "Commercial quantity", fit: "Business-grade replacement", eta: "Commercial shipping varies", score: 74, searchQuery: query }
  ].map((option) => restockOption(option, { id: "custom", businessFit: [businessType] }, query, businessType));
}

function estimatedProductProfile(query, businessType) {
  const text = String(query || "").toLowerCase();
  const restaurant = ["restaurant", "food stall", "coffee shop"].includes(businessType);
  if (/(recliner|sofa|couch|loveseat|lounge chair)/i.test(text)) return { prefix: "Commercial lounge", commercialLabel: "Business-grade lounge", basePrice: 179, pack: "1 chair", smallPack: "1 chair", bulkPack: "2 chair pack", businessProvider: restaurant ? "webstaurant" : "uline" };
  if (/(table|desk|counter|stand)/i.test(text)) return { prefix: "Commercial", commercialLabel: "Business-grade", basePrice: 89, pack: "1 item", smallPack: "1 item", bulkPack: "2-4 item pack", businessProvider: restaurant ? "webstaurant" : "uline" };
  if (/(chair|stool|seat)/i.test(text)) return { prefix: "Stackable", commercialLabel: "Commercial", basePrice: 49, pack: "2 count", smallPack: "1-2 count", bulkPack: "4 count", businessProvider: restaurant ? "webstaurant" : "uline" };
  if (/(glove|napkin|cup|lid|container|bag|straw|plate|bowl|utensil|fork|spoon|knife)/i.test(text)) return { prefix: "Bulk", commercialLabel: "Foodservice", basePrice: 24, pack: "100-500 count", smallPack: "40-100 count", bulkPack: "500-1000 count", businessProvider: "webstaurant" };
  if (/(clean|soap|sanitizer|towel|trash|mop|wipe)/i.test(text)) return { prefix: "Commercial", commercialLabel: "Janitorial", basePrice: 32, pack: "multi-pack", smallPack: "small pack", bulkPack: "case pack", businessProvider: "uline" };
  if (/(paper|receipt|label|printer|ink|pos)/i.test(text)) return { prefix: "Business", commercialLabel: "Office", basePrice: 28, pack: "multi-pack", smallPack: "small pack", bulkPack: "case pack", businessProvider: "staples" };
  return { prefix: "Best-selling", commercialLabel: "Business-grade", basePrice: 39, pack: "standard pack", smallPack: "small pack", bulkPack: "bulk pack", businessProvider: restaurant ? "webstaurant" : "uline" };
}

function restockOption(option, category, query, businessType) {
  const provider = RESTOCK_PROVIDERS.find((item) => item.id === option.provider) || RESTOCK_PROVIDERS[0];
  const unitPrice = estimateUnitPrice(option.price, option.pack);
  const reviewScore = clamp(Math.log10(Math.max(10, option.reviews || 10)) / 4.2, 0, 1);
  const ratingScore = clamp(((option.rating || 0) - 3.6) / 1.4, 0, 1);
  const fitScore = category.businessFit.includes(businessType) ? 1 : 0.75;
  const priceScore = clamp(1 - (Number(option.price || 0) / 220), 0.25, 1);
  const score = Math.round((ratingScore * 38 + reviewScore * 27 + priceScore * 20 + fitScore * 15));
  const supplierQuery = String(option.searchQuery || `${query} ${option.title}`).replace(/\s+/g, " ").trim();
  const fallbackImage = restockImageDataUri(provider, option.title, category.id);
  const extractedImage = option.imageUrl || option.thumbnailUrl || "";

  return {
    id: `${provider.id}-${slugify(option.title)}`,
    provider: provider.name,
    domain: provider.domain,
    title: option.title,
    price: formatMoney(option.price),
    priceNumber: Number(option.price || 0),
    unitPrice,
    pack: option.pack,
    rating: option.rating,
    reviews: option.reviews,
    salesSignal: option.salesSignal,
    stock: option.stock,
    fit: option.fit,
    eta: option.eta,
    score,
    why: `${provider.name} is a strong compare point for ${option.fit.toLowerCase()}: ${option.salesSignal.toLowerCase()}, ${option.pack}, and ${option.stock.toLowerCase()}.`,
    caution: "Confirm live price, shipping, return terms and exact dimensions before purchase.",
    url: provider.url(supplierQuery),
    image: extractedImage || fallbackImage,
    fallbackImage,
    imageSource: extractedImage ? "supplier" : "generated"
  };
}

function restockSummary(query, category, options, profile) {
  const best = options[0];
  const storeArea = storeAreaLabel(profile);
  if (!best) return `Search supplier pages for ${query} and compare live prices before buying.`;
  return `${best.provider} currently ranks best for ${query} in this comparison. Use this for ${storeArea}: compare unit price, pack size, review volume and pickup/shipping speed before purchasing.`;
}

function customRestockSummary(query, options, profile) {
  const providerNames = options.map((item) => item.provider).slice(0, 3).join(", ");
  return `Custom search for ${query}. Use this for ${storeAreaLabel(profile)}: open ${providerNames || "supplier"} rows and compare real product images, live price, stock, review count, shipping speed and return terms.`;
}

function restockSuggestionsForType(type) {
  const common = ["cleaning supplies", "receipt paper", "storage shelves"];
  const byType = {
    restaurant: ["chairs", "takeout containers", "nitrile gloves", "paper cups"],
    "food stall": ["takeout containers", "paper cups", "nitrile gloves", "folding table"],
    "coffee shop": ["paper cups", "chairs", "napkins", "receipt paper"],
    grocery: ["storage shelves", "trash bags", "gloves", "labels"],
    retail: ["storage shelves", "shopping bags", "receipt paper", "display racks"],
    salon: ["cleaning supplies", "towels", "waiting chairs", "gloves"],
    barbershop: ["cleaning supplies", "waiting chairs", "towels", "clipper disinfectant"],
    laundromat: ["cleaning supplies", "storage bins", "trash bags", "folding table"],
    pharmacy: ["storage shelves", "labels", "receipt paper", "cleaning supplies"],
    daycare: ["cleaning supplies", "storage bins", "chairs", "paper towels"],
    "auto repair": ["storage shelves", "nitrile gloves", "shop towels", "trash bags"]
  };
  return uniqueStrings([...(byType[type] || []), ...common]).slice(0, 7);
}

function estimateUnitPrice(price, pack) {
  const count = Number(String(pack || "").match(/\d+/)?.[0] || 1);
  if (!Number.isFinite(price) || !count) return "";
  return `${formatMoney(price / count)} each`;
}

function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return "Check live price";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function restockImageDataUri(provider, title, category) {
  const shape = restockProductShape(category, provider.color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="116" viewBox="0 0 140 116"><rect width="140" height="116" rx="10" fill="#181c17"/><rect x="8" y="8" width="124" height="100" rx="8" fill="#222820" stroke="#3b4438"/><rect x="8" y="8" width="6" height="100" rx="3" fill="${provider.color}"/><g>${shape}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function restockProductShape(category, color) {
  const stroke = "#f3f2ec";
  const muted = "#9da396";
  if (category === "chairs") {
    return `<rect x="48" y="31" width="48" height="34" rx="5" fill="${color}" opacity=".95"/><path d="M52 66v24M92 66v24M48 46h-8v26M96 46h8v26" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/><path d="M50 67h44" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (category === "takeout") {
    return `<path d="M34 48h72l-8 38H42z" fill="${color}" opacity=".95"/><path d="M38 47l10-18h44l10 18M43 63h58" stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M52 78h38" stroke="${muted}" stroke-width="5" stroke-linecap="round"/>`;
  }
  if (category === "utensils") {
    return `<path d="M48 26c10 0 17 8 17 18 0 8-5 14-11 17v31" stroke="${stroke}" stroke-width="8" stroke-linecap="round"/><path d="M48 26c-10 0-17 8-17 18 0 8 5 14 11 17v31" stroke="${stroke}" stroke-width="8" stroke-linecap="round"/><path d="M86 24v68M76 24v26M96 24v26" stroke="${color}" stroke-width="7" stroke-linecap="round"/><path d="M76 52h20" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (category === "cleaning") {
    return `<path d="M61 25h22v14l10 12v38H51V51l10-12z" fill="${color}" opacity=".95"/><path d="M61 25h22M55 58h34M59 76h26" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/><rect x="63" y="15" width="18" height="13" rx="3" fill="${stroke}"/>`;
  }
  if (category === "office-pos") {
    return `<rect x="35" y="34" width="70" height="54" rx="8" fill="${color}" opacity=".95"/><path d="M47 51h46M47 65h35M47 79h25" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/><circle cx="97" cy="82" r="8" fill="${stroke}"/>`;
  }
  if (category === "shelving") {
    return `<path d="M38 29v62M102 29v62" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/><rect x="34" y="36" width="72" height="12" rx="3" fill="${color}"/><rect x="34" y="57" width="72" height="12" rx="3" fill="${color}"/><rect x="34" y="78" width="72" height="12" rx="3" fill="${color}"/>`;
  }
  return `<rect x="38" y="38" width="64" height="48" rx="7" fill="${color}" opacity=".95"/><path d="M38 52h64M52 38v48M88 38v48" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>`;
}

function escapeSvgText(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function profileFromSearch(params) {
  const hasParams = [...params.keys()].length > 0;
  const out = hasParams
    ? {
        businessName: "Unnamed shop",
        businessType: "retail",
        address: "",
        city: "",
        state: "CA",
        radiusMeters: 1200
      }
    : { ...DEFAULT_PROFILE };

  for (const key of ["businessName", "businessType", "address", "city", "state"]) {
    const value = params.get(key);
    if (value !== null && value !== "") out[key] = value;
  }

  const latRaw = params.get("lat");
  const lonRaw = params.get("lon");
  if (latRaw !== null && latRaw.trim() !== "" && lonRaw !== null && lonRaw.trim() !== "") {
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (!(lat === 0 && lon === 0 && out.address)) {
      out.lat = lat;
      out.lon = lon;
    }
  }

  out.radiusMeters = 0;
  out.state = out.state || "CA";
  out.businessType = normalizeType(out.businessType);
  return out;
}

async function serveStatic(requestPath, res) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const filePath = path.normalize(path.join(PUBLIC_DIR, cleanPath === "/" ? "index.html" : cleanPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, "Forbidden");
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return sendText(res, 404, "Not found");
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, "Not found");
  }
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function buildIntel(profile) {
  const startedAt = Date.now();
  const location = await geocode(profile);
  const context = { ...profile, ...location };
  const cityScope = await resolveCityScope(context);
  Object.assign(context, cityScope);
  context.localRadiusMeters = Number(profile.radiusMeters) || DEFAULT_PROFILE.radiusMeters;

  const [
    weather,
    air,
    alerts,
    police,
    cases311,
    marketScan,
    citySafety,
    cityInfrastructure,
    cityEconomy,
    news,
    regulatory,
    localEvents,
    earthquakes,
    eonet
  ] = await Promise.allSettled([
    fetchWeather(context),
    fetchAirQuality(context),
    fetchWeatherAlerts(context),
    fetchPoliceIncidents(context),
    fetch311Cases(context),
    fetchMarketScan(context),
    fetchCitySafety(context),
    fetchCityInfrastructure(context),
    fetchCityEconomy(context),
    fetchNews(context),
    fetchRegulatoryUpdates(context),
    fetchLocalEvents(context),
    fetchEarthquakes(context),
    fetchNaturalEvents(context)
  ]);

  const feeds = {
    weather: settledValue(weather),
    air: settledValue(air),
    alerts: settledValue(alerts),
    police: settledValue(police),
    cases311: settledValue(cases311),
    marketScan: settledValue(marketScan),
    citySafety: settledValue(citySafety),
    cityInfrastructure: settledValue(cityInfrastructure),
    cityEconomy: settledValue(cityEconomy),
    news: settledValue(news),
    regulatory: settledValue(regulatory),
    localEvents: settledValue(localEvents),
    earthquakes: settledValue(earthquakes),
    eonet: settledValue(eonet)
  };

  const synthesis = synthesizeSignals(context, feeds);
  const sourceHealth = Object.entries(feeds).map(([key, value]) => ({
    key,
    ok: Boolean(value?.ok),
    count: value?.count ?? value?.items?.length ?? value?.articles?.length ?? value?.events?.length ?? 0,
    message: value?.message || value?.error || "ok",
    url: value?.sourceUrl || null
  }));

  return {
    profile: context,
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    scores: synthesis.scores,
    banners: synthesis.banners,
    groups: synthesis.groups,
    recommendations: synthesis.recommendations,
    opportunities: synthesis.opportunities,
    warnings: synthesis.warnings,
    metrics: synthesis.metrics,
    weatherForecast: buildWeatherForecast(feeds.weather),
    citations: buildCitations(context, feeds, synthesis),
    licenseChecklist: licenseChecklistFor(context),
    sourceHealth,
    sources: SOURCE_CATALOG,
    marketPlaces: (feeds.marketScan?.items || []).slice(0, 40),
    marketProvider: feeds.marketScan?.provider || "overpass",
    marketIntelligence: feeds.marketScan?.intelligence || null,
    rawPreview: {
      weather: feeds.weather?.current || null,
      air: feeds.air?.current || null,
      police: (feeds.police?.items || []).slice(0, 5),
      cases311: (feeds.cases311?.items || []).slice(0, 5),
      marketScan: feeds.marketScan?.summary || null,
      citySafety: (feeds.citySafety?.articles || []).slice(0, 5),
      cityInfrastructure: (feeds.cityInfrastructure?.articles || []).slice(0, 5),
      cityEconomy: (feeds.cityEconomy?.articles || []).slice(0, 5),
      news: (feeds.news?.articles || []).slice(0, 5),
      regulatory: (feeds.regulatory?.articles || feeds.regulatory?.items || []).slice(0, 5),
      localEvents: (feeds.localEvents?.articles || []).slice(0, 5),
      earthquakes: (feeds.earthquakes?.items || []).slice(0, 5),
      eonet: (feeds.eonet?.events || []).slice(0, 5)
    }
  };
}

function settledValue(result) {
  if (result.status === "fulfilled") return result.value;
  return { ok: false, error: result.reason?.message || String(result.reason) };
}

async function geocode(profile) {
  if (Number.isFinite(profile.lat) && Number.isFinite(profile.lon)) {
    return {
      ok: true,
      lat: profile.lat,
      lon: profile.lon,
      locationLabel: profile.address || `${profile.city}, ${profile.state}`,
      city: profile.city || "",
      state: profile.state || "",
      geocoder: "profile"
    };
  }

  const queries = buildGeocodeQueries(profile);
  if (!queries.length) {
    return { ...DEFAULT_PROFILE, ok: false, geocoder: "fallback", locationLabel: DEFAULT_PROFILE.address };
  }

  let first = null;
  let url = "";
  for (const query of queries) {
    url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
    const data = await fetchJson(url, {
      headers: { "User-Agent": APP_USER_AGENT, "Accept-Language": "en" }
    }, 8000);
    first = Array.isArray(data) ? data[0] : null;
    if (first) break;
  }

  if (!first) {
    const fallback = knownLocationFallback(profile, queries[0]);
    if (fallback) return fallback;
    return {
      ok: false,
      lat: DEFAULT_PROFILE.lat,
      lon: DEFAULT_PROFILE.lon,
      city: DEFAULT_PROFILE.city,
      state: DEFAULT_PROFILE.state,
      locationLabel: queries[0],
      geocoder: "fallback",
      message: "Geocoder returned no result; using San Francisco default."
    };
  }

  const address = first.address || {};
  const resolvedCity = address.city || address.town || address.village || address.hamlet || address.municipality || stripCounty(address.county) || profile.city || "";
  const resolvedState = address.state || profile.state || "";

  return {
    ok: true,
    lat: Number(first.lat),
    lon: Number(first.lon),
    locationLabel: first.display_name || query,
    city: resolvedCity,
    state: resolvedState,
    geocoder: "nominatim",
    sourceUrl: "https://nominatim.openstreetmap.org/"
  };
}

async function resolveCityScope(profile) {
  const city = String(profile.city || "").trim();
  const state = String(profile.state || "").trim();
  const label = [city, state || "CA", "USA"].filter(Boolean).join(", ");
  const fallback = knownCityScope(profile);

  if (!city) {
    const radiusMeters = profile.radiusMeters || fallback?.radiusMeters || 16000;
    return {
      radiusMeters,
      cityRadiusMeters: radiusMeters,
      cityScopeLabel: "city-wide estimate",
      cityScopeSource: "store location fallback",
      cityCenterLat: profile.lat,
      cityCenterLon: profile.lon
    };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&extratags=1&q=${encodeURIComponent(label)}`;
    const data = await fetchJson(url, {
      headers: { "User-Agent": APP_USER_AGENT, "Accept-Language": "en" }
    }, 8000);
    const first = Array.isArray(data) ? data[0] : null;
    const bbox = first?.boundingbox?.map(Number);
    if (bbox?.length === 4 && bbox.every(Number.isFinite)) {
      const [south, north, west, east] = bbox;
      const cityCenterLat = (south + north) / 2;
      const cityCenterLon = (west + east) / 2;
      const corners = [
        [south, west],
        [south, east],
        [north, west],
        [north, east]
      ];
      const radiusMeters = clamp(Math.ceil(Math.max(
        ...corners.map(([lat, lon]) => distanceMeters(profile.lat, profile.lon, lat, lon)),
        distanceMeters(profile.lat, profile.lon, cityCenterLat, cityCenterLon)
      ) * 1.08), 3000, 85000);
      return {
        radiusMeters,
        cityRadiusMeters: radiusMeters,
        cityScopeLabel: `${city} city-wide`,
        cityScopeSource: "Nominatim city bounding box",
        cityCenterLat,
        cityCenterLon,
        cityBounds: { south, north, west, east },
        cityScopeUrl: "https://nominatim.openstreetmap.org/"
      };
    }
  } catch {
    // Known-city and radius fallback below keep the monitor useful when OSM throttles.
  }

  if (fallback) return fallback;
  const radiusMeters = clamp(Number(profile.radiusMeters || 16000), 3000, 85000);
  return {
    radiusMeters,
    cityRadiusMeters: radiusMeters,
    cityScopeLabel: `${city} city-wide estimate`,
    cityScopeSource: "estimated city radius",
    cityCenterLat: profile.lat,
    cityCenterLon: profile.lon
  };
}

async function fetchWeather(profile) {
  const params = new URLSearchParams({
    latitude: String(profile.lat),
    longitude: String(profile.lon),
    current: "temperature_2m,precipitation,wind_speed_10m,weather_code",
    hourly: "precipitation_probability,temperature_2m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "7"
  });
  const sourceUrl = `https://api.open-meteo.com/v1/forecast?${params}`;
  const data = await fetchJson(sourceUrl, {}, 9000);
  return {
    ok: true,
    sourceUrl,
    current: data.current || {},
    daily: data.daily || {},
    count: data.daily?.time?.length || 0
  };
}

async function fetchAirQuality(profile) {
  const params = new URLSearchParams({
    latitude: String(profile.lat),
    longitude: String(profile.lon),
    current: "us_aqi,pm2_5,ozone,nitrogen_dioxide,carbon_monoxide",
    hourly: "us_aqi,pm2_5",
    timezone: "auto",
    forecast_days: "5"
  });
  const sourceUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
  const data = await fetchJson(sourceUrl, {}, 9000);
  return {
    ok: true,
    sourceUrl,
    current: data.current || {},
    hourly: data.hourly || {},
    count: data.hourly?.time?.length || 0
  };
}

async function fetchWeatherAlerts(profile) {
  const sourceUrl = `https://api.weather.gov/alerts/active?point=${profile.lat},${profile.lon}`;
  const data = await fetchJson(sourceUrl, {
    headers: {
      "User-Agent": APP_USER_AGENT,
      Accept: "application/geo+json"
    }
  }, 9000);
  const items = (data.features || []).map((feature) => {
    const p = feature.properties || {};
    return {
      event: p.event,
      headline: p.headline,
      severity: p.severity,
      certainty: p.certainty,
      urgency: p.urgency,
      effective: p.effective,
      expires: p.expires,
      instruction: p.instruction,
      url: p["@id"] || p.id
    };
  });
  return { ok: true, sourceUrl, items, count: items.length };
}

async function fetchPoliceIncidents(profile) {
  if (!isSanFrancisco(profile)) {
    return {
      ok: true,
      sourceUrl: "https://data.sfgov.org/resource/wg3w-h783.json",
      items: [],
      count: 0,
      message: "SFPD adapter only runs for San Francisco locations."
    };
  }

  const start = daysAgo(180);
  const params = new URLSearchParams({
    "$select": "incident_datetime,incident_category,incident_subcategory,incident_description,intersection,latitude,longitude",
    "$where": `incident_datetime >= '${start}'`,
    "$order": "incident_datetime DESC",
    "$limit": "500"
  });
  const sourceUrl = `https://data.sfgov.org/resource/wg3w-h783.json?${params}`;
  const data = await fetchSocrata(sourceUrl);
  const radiusMeters = localBusinessRadiusMeters(profile, 3200);
  const items = (Array.isArray(data) ? data : [])
    .map((row) => ({
      title: row.incident_category || "Incident",
      subtitle: row.incident_subcategory || row.incident_description || "",
      when: row.incident_datetime,
      place: row.intersection || "San Francisco",
      lat: Number(row.latitude),
      lon: Number(row.longitude),
      distanceMeters: distanceMeters(profile.lat, profile.lon, Number(row.latitude), Number(row.longitude))
    }))
    .filter((row) => Number.isFinite(row.distanceMeters) && row.distanceMeters <= radiusMeters)
    .slice(0, 50);

  return { ok: true, sourceUrl, items, count: items.length };
}

async function fetch311Cases(profile) {
  if (!isSanFrancisco(profile)) {
    return {
      ok: true,
      sourceUrl: "https://data.sfgov.org/resource/vw6y-z8j6.json",
      items: [],
      count: 0,
      message: "DataSF 311 adapter only runs for San Francisco locations."
    };
  }

  const start = daysAgo(120);
  const params = new URLSearchParams({
    "$select": "service_request_id,requested_datetime,service_name,service_subtype,service_details,status_description,address,lat,long",
    "$where": `requested_datetime >= '${start}'`,
    "$order": "requested_datetime DESC",
    "$limit": "700"
  });
  const sourceUrl = `https://data.sfgov.org/resource/vw6y-z8j6.json?${params}`;
  const data = await fetchSocrata(sourceUrl);
  const radiusMeters = localBusinessRadiusMeters(profile, 4500);
  const items = (Array.isArray(data) ? data : [])
    .map((row) => ({
      id: row.service_request_id,
      title: row.service_name || "311 case",
      subtitle: row.service_subtype || row.service_details || "",
      status: row.status_description || "",
      when: row.requested_datetime,
      place: row.address || "San Francisco",
      lat: Number(row.lat),
      lon: Number(row.long),
      distanceMeters: distanceMeters(profile.lat, profile.lon, Number(row.lat), Number(row.long))
    }))
    .filter((row) => Number.isFinite(row.distanceMeters) && row.distanceMeters <= radiusMeters)
    .slice(0, 75);

  return { ok: true, sourceUrl, items, count: items.length };
}

// Cache Apify places aggressively so the hackathon demo stays responsive and
// does not re-burn credits while the judges are watching the same storefront.
const APIFY_PLACES_TTL_MS = Number(process.env.APIFY_PLACES_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;

async function fetchApifyPlaces(profile) {
  const radius = localBusinessRadiusMeters(profile, 4800);
  const actorId = process.env.APIFY_PLACES_ACTOR || "compass/crawler-google-places";
  const max = Number(process.env.APIFY_MAX_PLACES || 10);
  const queries = competitorSearchQueries(profile);
  const sourceUrl = googleMapsSearchUrl(queries[0], profile);
  const consoleUrl = `https://console.apify.com/actors/${actorId.replace("/", "~")}`;

  const cacheKeyParts = [
    actorId,
    "v7",
    String(profile.city || "").toLowerCase().trim(),
    String(profile.state || "").toLowerCase().trim(),
    normalizeType(profile.businessType),
    max
  ];
  const cacheKey = cacheKeyParts.join("|");
  const legacyCacheKey = [actorId, "v6", ...cacheKeyParts.slice(2)].join("|");
  const cached = APIFY_PLACES_CACHE.get(cacheKey) || APIFY_PLACES_CACHE.get(legacyCacheKey);
  if (cached && (Date.now() - cached.at) < APIFY_PLACES_TTL_MS) {
    const normalized = normalizeCachedApifyPlaces(cached.payload, profile, radius, sourceUrl, consoleUrl, actorId);
    return { ...normalized, message: `${normalized.message} (cached ${Math.round((Date.now() - cached.at) / 1000)}s ago)` };
  }

  // Tight search radius so Google Maps returns places ACTUALLY near the store,
  // not anything that mentions the city in a 75 km bounding box.
  const radiusKmCap = Number(process.env.APIFY_PLACES_RADIUS_KM || 6);
  const searchRadiusKm = Math.min(radiusKmCap, Math.max(2, Math.round(radius / 1000)));
  const input = {
    searchStringsArray: queries,
    maxCrawledPlacesPerSearch: max,
    language: "en",
    skipClosedPlaces: true,
    additionalInfo: true,
    scrapePlaceDetailPage: true,
    customGeolocation: {
      type: "Point",
      coordinates: [Number(profile.lon), Number(profile.lat)],
      radiusKm: searchRadiusKm
    }
  };
  if (profile.city) {
    input.locationQuery = [profile.city, profile.state || "", "USA"].filter(Boolean).join(", ");
  }

  const result = await runApifyActor(actorId, input, Number(process.env.APIFY_PLACES_TIMEOUT_MS || 20000));
  if (!result.ok) {
    return {
      ok: false,
      sourceUrl,
      technicalUrl: consoleUrl,
      provider: "apify",
      items: [],
      count: 0,
      error: result.error,
      message: `Apify Actor ${actorId} did not return: ${result.error}`
    };
  }

  const items = (result.items || []).map((place) => ({
    name: place.title || place.name || "Place",
    category: place.categoryName || place.category || (Array.isArray(place.categories) ? place.categories[0] : "") || "business",
    categories: Array.isArray(place.categories) ? place.categories : [],
    cuisine: Array.isArray(place.categories) ? place.categories.find((c) => /food|cuisine|kitchen/i.test(c)) || "" : "",
    openingHours: formatApifyHours(place.openingHours),
    openingHoursStruct: parseOpeningHours(place.openingHours),
    rating: Number(place.totalScore ?? place.rating) || null,
    reviews: Number(place.reviewsCount ?? 0) || null,
    price: typeof place.price === "string" ? place.price.trim() : "",
    priceTier: priceTierFromString(place.price),
    description: typeof place.description === "string" ? place.description : "",
    reviewsTags: Array.isArray(place.reviewsTags) ? place.reviewsTags.slice(0, 8).map((tag) => ({
      title: String(tag.title || tag.name || tag).trim(),
      count: Number(tag.count) || 0
    })).filter((tag) => tag.title) : [],
    popularTimes: compactPopularTimes(place.popularTimesHistogram),
    liveBusyText: place.popularTimesLiveText || "",
    liveBusyPercent: Number(place.popularTimesLivePercent) || null,
    reviewsDistribution: place.reviewsDistribution || null,
    neighborhood: place.neighborhood || "",
    menuUrl: place.menu || "",
    phone: place.phone || place.phoneUnformatted || "",
    website: place.website || "",
    address: place.address || "",
    lat: Number(place.location?.lat ?? place.lat),
    lon: Number(place.location?.lng ?? place.lon ?? place.lng),
    url: googleMapsUrlFromPlace(place, profile)
  }))
    .filter((item) => item.name && item.category)
    .map((item) => ({
      ...item,
      distanceMeters: distanceMeters(profile.lat, profile.lon, item.lat, item.lon)
    }))
    .filter((item) => Number.isFinite(item.distanceMeters) && item.distanceMeters <= radius);

  const categories = topCounts(items.map((item) => item.category), 8);
  const sameCategory = competitorCategories(profile.businessType);
  const competitors = items
    .filter((item) => sameCategory.some((term) => String(item.category).toLowerCase().includes(term)))
    .sort((a, b) => apifyCompetitorScore(b) - apifyCompetitorScore(a) || a.distanceMeters - b.distanceMeters)
    .slice(0, 15);

  const intelligence = buildMarketIntelligence(items, competitors, profile);
  const payload = {
    ok: true,
    sourceUrl,
    technicalUrl: consoleUrl,
    provider: "apify",
    actorId,
    items: competitors,
    count: items.length,
    summary: {
      radiusMeters: radius,
      topCategories: categories,
      competitorCount: competitors.length,
      sampleCompetitors: competitors.slice(0, 6)
    },
    intelligence,
    message: `${profile.city || "City"} Google Places scan via Apify Actor ${actorId} returned ${items.length} live business records.`
  };
  APIFY_PLACES_CACHE.set(cacheKey, { at: Date.now(), payload });
  persistPlacesCache();
  return payload;
}

function normalizeCachedApifyPlaces(payload, profile, radius, sourceUrl, consoleUrl, actorId) {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const items = rawItems.map((place) => {
    const lat = Number(place.location?.lat ?? place.lat);
    const lon = Number(place.location?.lng ?? place.lon ?? place.lng);
    return {
      name: place.title || place.name || "Place",
      category: place.categoryName || place.category || (Array.isArray(place.categories) ? place.categories[0] : "") || "business",
      categories: Array.isArray(place.categories) ? place.categories : [],
      cuisine: place.cuisine || "",
      openingHours: formatApifyHours(place.openingHours),
      openingHoursStruct: Array.isArray(place.openingHoursStruct) ? place.openingHoursStruct : parseOpeningHours(place.openingHours),
      rating: Number(place.totalScore ?? place.rating) || null,
      reviews: Number(place.reviewsCount ?? place.reviews) || null,
      price: typeof place.price === "string" ? place.price.trim() : "",
      priceTier: Number(place.priceTier) || priceTierFromString(place.price),
      description: typeof place.description === "string" ? place.description : "",
      reviewsTags: Array.isArray(place.reviewsTags) ? place.reviewsTags.slice(0, 8).map((tag) => ({
        title: String(tag.title || tag.name || tag).trim(),
        count: Number(tag.count) || 0
      })).filter((tag) => tag.title) : [],
      popularTimes: place.popularTimes || compactPopularTimes(place.popularTimesHistogram),
      liveBusyText: place.popularTimesLiveText || place.liveBusyText || "",
      liveBusyPercent: Number(place.popularTimesLivePercent ?? place.liveBusyPercent) || null,
      reviewsDistribution: place.reviewsDistribution || null,
      neighborhood: place.neighborhood || "",
      menuUrl: place.menu || place.menuUrl || "",
      phone: place.phone || place.phoneUnformatted || "",
      website: place.website || "",
      address: place.address || "",
      lat,
      lon,
      url: googleMapsUrlFromPlace(place, profile),
      distanceMeters: distanceMeters(profile.lat, profile.lon, lat, lon)
    };
  })
    .filter((item) => item.name && item.category)
    .filter((item) => Number.isFinite(item.distanceMeters) && item.distanceMeters <= radius);

  const sameCategory = competitorCategories(profile.businessType);
  const competitors = items
    .filter((item) => {
      const haystack = [item.category, ...(item.categories || [])].join(" ").toLowerCase();
      return sameCategory.some((term) => haystack.includes(term));
    })
    .sort((a, b) => apifyCompetitorScore(b) - apifyCompetitorScore(a) || a.distanceMeters - b.distanceMeters)
    .slice(0, 15);
  const visibleItems = competitors.length ? competitors : items.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 15);
  const intelligence = buildMarketIntelligence(items, visibleItems, profile);
  return {
    ok: true,
    sourceUrl,
    technicalUrl: payload?.technicalUrl || consoleUrl,
    provider: "apify",
    actorId: payload?.actorId || actorId,
    items: visibleItems,
    count: items.length,
    summary: {
      radiusMeters: radius,
      topCategories: topCounts(items.map((item) => item.category), 8),
      competitorCount: visibleItems.length,
      sampleCompetitors: visibleItems.slice(0, 6)
    },
    intelligence,
    message: `${profile.city || "City"} Google Places scan via Apify returned ${items.length} local business records`
  };
}

function priceTierFromString(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  // Numeric ranges like "$20–30", "$50-100" win over dollar count.
  const numMatch = text.match(/\d+/);
  if (numMatch) {
    const num = Number(numMatch[0]);
    if (Number.isFinite(num) && num > 0) {
      if (num <= 12) return 1;
      if (num <= 25) return 2;
      if (num <= 45) return 3;
      return 4;
    }
  }
  // Pure $-token strings ("$", "$$", "$$$", "$$$$").
  const dollars = (text.match(/\$/g) || []).length;
  if (dollars > 0) return Math.min(dollars, 4);
  return 0;
}

function priceTierLabel(tier) {
  return tier > 0 ? "$".repeat(Math.min(tier, 4)) : "—";
}

function buildMarketIntelligence(items, competitors, profile) {
  const sample = competitors.length >= 4 ? competitors : items;
  const priceCounts = [0, 0, 0, 0]; // index 0 = $, 1 = $$, 2 = $$$, 3 = $$$$
  let priced = 0;
  for (const item of sample) {
    const tier = item.priceTier || priceTierFromString(item.price);
    if (tier >= 1 && tier <= 4) {
      priceCounts[tier - 1] += 1;
      priced += 1;
    }
  }
  const dominantTierIndex = priceCounts.indexOf(Math.max(...priceCounts));
  const dominantTier = priced > 0 ? dominantTierIndex + 1 : 0;
  const priceDistribution = priceCounts.map((count, index) => ({
    tier: index + 1,
    label: priceTierLabel(index + 1),
    count,
    pct: priced ? Math.round((count / priced) * 100) : 0
  }));

  const tagCounts = new Map();
  for (const item of sample) {
    for (const tag of item.reviewsTags || []) {
      const key = tag.title.toLowerCase();
      const prev = tagCounts.get(key) || { title: tag.title, count: 0, places: 0 };
      prev.count += tag.count;
      prev.places += 1;
      tagCounts.set(key, prev);
    }
  }
  const topReviewTags = [...tagCounts.values()]
    .sort((a, b) => (b.places * 1000 + b.count) - (a.places * 1000 + a.count))
    .slice(0, 12);

  const ratings = sample.map((item) => Number(item.rating)).filter((r) => r > 0);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const topRated = [...sample]
    .filter((item) => Number(item.rating) > 0)
    .sort((a, b) => (Number(b.rating) || 0) * Math.log10(Math.max(10, Number(b.reviews) || 10)) - (Number(a.rating) || 0) * Math.log10(Math.max(10, Number(a.reviews) || 10)))
    .slice(0, 3)
    .map((item) => ({ name: item.name, rating: item.rating, reviews: item.reviews, price: item.price, url: item.url }));

  const recommendations = [];
  if (dominantTier >= 3) {
    recommendations.push({
      title: `Most nearby spots are ${priceTierLabel(dominantTier)} — premium pricing is normalized in this area`,
      action: "Test a premium signature item or chef's special priced 25-40% above your current top item. Track redemption for two weeks.",
      detail: `${priceCounts[dominantTier - 1]} of ${priced} priced competitors fall in the ${priceTierLabel(dominantTier)} tier.`
    });
  } else if (dominantTier === 2) {
    recommendations.push({
      title: `Neighborhood is ${priceTierLabel(dominantTier)} — pricing battle is real`,
      action: "Differentiate on speed, portion size, or one signature item rather than discounting. Run a 2-week A/B on a +$2 add-on.",
      detail: `${priceCounts[1]} of ${priced} priced competitors are ${priceTierLabel(2)}.`
    });
  } else if (dominantTier === 1) {
    recommendations.push({
      title: `Most nearby spots are ${priceTierLabel(dominantTier)} — value-driven block`,
      action: "Lead with a clear bundle/combo under $12. Avoid premium-only menu — it will under-convert in this area.",
      detail: `${priceCounts[0]} of ${priced} priced competitors are ${priceTierLabel(1)}.`
    });
  }

  if (avgRating >= 4.5) {
    recommendations.push({
      title: `Tough block: nearby average is ${avgRating.toFixed(1)}★`,
      action: `Reviews are the moat here. Ask your top customers for one-line Google reviews this week — every new ${avgRating.toFixed(1)}★ review compounds discovery.`,
      detail: `${ratings.length} priced competitors averaging ${avgRating.toFixed(1)}★.`
    });
  }

  const positivePraise = topReviewTags.filter((tag) => /good|great|fresh|friendly|fast|best|delicious|amazing|excellent|cozy|clean|quick|tasty/i.test(tag.title)).slice(0, 5);
  const negativeFlags = topReviewTags.filter((tag) => /slow|rude|small|expensive|wait|long|noisy|crowded|dirty|cold/i.test(tag.title)).slice(0, 4);
  if (negativeFlags.length) {
    recommendations.push({
      title: `Common complaints in this area: ${negativeFlags.map((t) => t.title).join(", ")}`,
      action: `Audit your store for these specific issues — they hurt nearby competitors. If you already do these well, feature it on signage / menu / website.`,
      detail: `Themes appear in reviews of ${negativeFlags.reduce((sum, t) => sum + t.places, 0)} nearby places.`
    });
  }
  if (positivePraise.length) {
    recommendations.push({
      title: `Customers nearby praise: ${positivePraise.map((t) => t.title).join(", ")}`,
      action: `Match these themes in your front-of-house experience and lean into the same words in your Google business description and Yelp page.`,
      detail: `Aggregated from ${positivePraise.reduce((sum, t) => sum + t.places, 0)} review tag mentions.`
    });
  }

  // Specific menu items / amenities mentioned across multiple places — these
  // are the signature dishes and features customers in this neighborhood
  // expect or seek. Surfacing them is uniquely useful (and only possible
  // because Apify scrapes review tags).
  const signatureSignals = topReviewTags.filter((tag) =>
    tag.places >= 3 &&
    tag.title.split(/\s+/).length >= 2 &&
    !/good|great|fresh|friendly|fast|best|slow|rude|small|expensive|wait/i.test(tag.title)
  ).slice(0, 5);
  if (signatureSignals.length) {
    const list = signatureSignals.map((t) => `"${t.title}" (${t.places})`).join(", ");
    recommendations.push({
      title: `Signature signals in this block: ${signatureSignals.slice(0, 4).map((t) => t.title).join(", ")}`,
      action: `Customers actively look for these in this area. Add the closest match to your menu or storefront signage and call it out in your Google business description.`,
      detail: `Mentions across nearby places: ${list}.`
    });
  }

  const busyHeatmap = aggregateBusyHeatmap(sample);
  if (busyHeatmap?.peakDay && busyHeatmap.peakValue >= 60) {
    recommendations.push({
      title: `Block peaks ${busyHeatmap.peakDay} at ${formatHour12(busyHeatmap.peakHour)} (~${busyHeatmap.peakValue}% busy)`,
      action: "Staff up 30 min ahead of the peak window. Pre-prep top sellers, push pickup before peak so dine-in seats free up faster, and put your highest-margin item on counter signage.",
      detail: `Aggregated from ${busyHeatmap.contributing} nearby places' popular-times histograms.`
    });
  }
  const priceVsRating = sample
    .filter((item) => item.priceTier > 0 && Number(item.rating) > 0)
    .map((item) => ({
      name: item.name,
      tier: item.priceTier,
      price: item.price,
      rating: Number(item.rating),
      reviews: Number(item.reviews) || 0,
      url: item.url
    }));

  const categoryBreakdown = computeCategoryBreakdown(sample, profile);
  const hoursCoverage = computeHoursCoverage(sample);

  if (hoursCoverage?.openLateCount && profile && ["restaurant", "coffee shop", "laundromat", "pharmacy", "liquor store"].includes(normalizeType(profile.businessType))) {
    recommendations.push({
      title: `${hoursCoverage.openLateCount} of ${hoursCoverage.contributing} nearby places stay open past 9pm`,
      action: "If your hours close earlier, you may be missing the late evening window. Pilot extended hours on Fri/Sat for 2 weeks and measure incremental revenue against added labor cost.",
      detail: `Hours coverage was parsed from ${hoursCoverage.contributing} nearby places.`
    });
  }
  if (hoursCoverage?.openEarlyCount && profile && ["coffee shop", "restaurant", "grocery", "pharmacy"].includes(normalizeType(profile.businessType))) {
    recommendations.push({
      title: `${hoursCoverage.openEarlyCount} of ${hoursCoverage.contributing} nearby places open before 8am`,
      action: "Early-morning is a real demand window in this block. If you don't already, add a 7am open Mon-Fri and track foot traffic vs current opening time.",
      detail: `Hours coverage parsed from ${hoursCoverage.contributing} nearby places.`
    });
  }

  return {
    competitorsAnalyzed: sample.length,
    pricedCompetitors: priced,
    avgRating: Number(avgRating.toFixed(2)) || null,
    dominantTier,
    dominantTierLabel: dominantTier ? priceTierLabel(dominantTier) : "",
    priceDistribution,
    topReviewTags,
    positivePraise,
    negativeFlags,
    topRated,
    recommendations,
    busyHeatmap,
    priceVsRating,
    categoryBreakdown,
    hoursCoverage
  };
}

function parseOpeningHours(hours) {
  // Apify returns either a string ("Monday: 11 AM to 10 PM; ...") or an array
  // ([{day: "Monday", hours: "11 AM to 10 PM"}, ...]). We normalize to a 7-element
  // array of {open, close} hour numbers (0-24, with -1 = closed, 24 = open 24h).
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const out = days.map(() => null);
  let entries = [];
  if (typeof hours === "string") {
    entries = hours.split(/;|,/).map((part) => part.trim()).filter(Boolean);
  } else if (Array.isArray(hours)) {
    entries = hours.map((h) => `${h.day || h.weekDay || ""}: ${h.hours || h.openTime || ""}`);
  } else {
    return out;
  }

  for (const entry of entries) {
    const m = entry.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*:?\s*(.+)/i);
    if (!m) continue;
    const dayIdx = days.findIndex((d) => d.toLowerCase() === m[1].toLowerCase());
    if (dayIdx < 0) continue;
    const range = m[2].trim();
    if (/closed/i.test(range)) {
      out[dayIdx] = { open: -1, close: -1 };
      continue;
    }
    if (/(24\s*hours|open\s*24)/i.test(range)) {
      out[dayIdx] = { open: 0, close: 24 };
      continue;
    }
    const rm = range.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|–|—|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!rm) continue;
    out[dayIdx] = {
      open: hourToFloat(rm[1], rm[2], rm[3]),
      close: hourToFloat(rm[4], rm[5], rm[6])
    };
  }
  return out;
}

function hourToFloat(hStr, mStr, ampm) {
  let h = Number(hStr);
  const m = Number(mStr) || 0;
  const period = String(ampm || "").toLowerCase();
  if (period === "pm" && h < 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  return h + m / 60;
}

function computeCategoryBreakdown(places, profile) {
  const counts = new Map();
  for (const p of places || []) {
    if (!p.category) continue;
    const label = String(p.category).trim();
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const total = places?.length || 0;
  if (!total) return null;
  const entries = [...counts.entries()]
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
  const top = entries.slice(0, 5);
  const otherCount = entries.slice(5).reduce((sum, e) => sum + e.count, 0);
  if (otherCount) {
    top.push({ label: "Other", count: otherCount, pct: Math.round((otherCount / total) * 100) });
  }
  const sectorLabel = breakdownSectorLabel(profile?.businessType);
  return { sectorLabel, total, entries: top };
}

function breakdownSectorLabel(businessType) {
  const type = normalizeType(businessType);
  const labels = {
    "restaurant":   "Cuisines on this block",
    "coffee shop":  "Café styles on this block",
    "food stall":   "Food types on this block",
    "grocery":      "Grocery formats on this block",
    "retail":       "Retail categories on this block",
    "salon":        "Salon types on this block",
    "barbershop":   "Barber styles on this block",
    "laundromat":   "Laundry services on this block",
    "pharmacy":     "Pharmacy formats on this block",
    "daycare":      "Childcare formats on this block",
    "auto repair":  "Auto service types on this block",
    "liquor store": "Beverage retail on this block"
  };
  return labels[type] || "Categories on this block";
}

function computeHoursCoverage(places) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hoursOpenCount = Array.from({ length: 24 }, () => 0);
  let contributing = 0;
  let openLateCount = 0;
  let openEarlyCount = 0;
  let open24Count = 0;
  for (const p of places || []) {
    const oh = p.openingHoursStruct;
    if (!Array.isArray(oh) || !oh.some(Boolean)) continue;
    contributing += 1;
    let everLate = false;
    let everEarly = false;
    let any24 = false;
    for (const day of oh) {
      if (!day || day.open < 0) continue;
      if (day.open <= 0 && day.close >= 24) any24 = true;
      if (day.close >= 21 || (day.close > 0 && day.close < day.open)) everLate = true;
      if (day.open <= 8) everEarly = true;
      const start = Math.max(0, Math.floor(day.open));
      const end = Math.min(24, Math.ceil(day.close <= day.open ? 24 : day.close));
      for (let h = start; h < end; h += 1) hoursOpenCount[h] += 1;
    }
    if (everLate) openLateCount += 1;
    if (everEarly) openEarlyCount += 1;
    if (any24) open24Count += 1;
  }
  if (!contributing) return null;
  // Normalize: count is summed across all days, so divide by 7 to get an avg-per-day count.
  const avgOpenByHour = hoursOpenCount.map((sum) => Math.round((sum / 7) * 10) / 10);
  let peakHour = 0;
  let peakValue = 0;
  for (let h = 0; h < 24; h += 1) {
    if (avgOpenByHour[h] > peakValue) {
      peakValue = avgOpenByHour[h];
      peakHour = h;
    }
  }
  return {
    contributing,
    openLateCount,
    openEarlyCount,
    open24Count,
    avgOpenByHour,
    peakHour,
    peakValue,
    days
  };
}

function compactPopularTimes(histogram) {
  if (!histogram || typeof histogram !== "object") return null;
  const dayMap = { Su: "Sun", Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat" };
  const out = {};
  for (const [shortDay, full] of Object.entries(dayMap)) {
    const entries = histogram[shortDay];
    if (!Array.isArray(entries)) continue;
    const hours = new Array(24).fill(0);
    for (const e of entries) {
      const h = Number(e?.hour);
      const v = Number(e?.occupancyPercent);
      if (Number.isFinite(h) && h >= 0 && h <= 23 && Number.isFinite(v)) {
        hours[h] = v;
      }
    }
    out[full] = hours;
  }
  return Object.keys(out).length ? out : null;
}

function aggregateBusyHeatmap(places) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const grid = days.map(() => new Array(24).fill(0));
  const counts = days.map(() => new Array(24).fill(0));
  let contributing = 0;
  for (const place of places || []) {
    const pt = place?.popularTimes;
    if (!pt) continue;
    contributing += 1;
    for (let d = 0; d < days.length; d += 1) {
      const dayName = days[d];
      const arr = pt[dayName];
      if (!Array.isArray(arr)) continue;
      for (let h = 0; h < 24; h += 1) {
        if (arr[h] > 0) {
          grid[d][h] += arr[h];
          counts[d][h] += 1;
        }
      }
    }
  }
  if (!contributing) return null;
  const avg = grid.map((row, d) => row.map((sum, h) => counts[d][h] ? Math.round(sum / counts[d][h]) : 0));
  let peakDay = "";
  let peakHour = 0;
  let peakValue = 0;
  for (let d = 0; d < days.length; d += 1) {
    for (let h = 0; h < 24; h += 1) {
      if (avg[d][h] > peakValue) {
        peakValue = avg[d][h];
        peakDay = days[d];
        peakHour = h;
      }
    }
  }
  return { days, hours: Array.from({ length: 24 }, (_, i) => i), grid: avg, peakDay, peakHour, peakValue, contributing };
}

function formatHour12(hour) {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function competitorSearchQueries(profile) {
  const city = profile.city || profile.locationLabel || "";
  const type = normalizeType(profile.businessType);
  const tail = city ? ` in ${city}` : " near me";
  const queriesByType = {
    "restaurant":   [`restaurants${tail}`, `popular dining${tail}`],
    "coffee shop":  [`coffee shops${tail}`, `cafes${tail}`],
    "food stall":   [`food trucks${tail}`, `street food${tail}`],
    "grocery":      [`grocery stores${tail}`, `supermarkets${tail}`],
    "retail":       [`shops${tail}`, `boutiques${tail}`],
    "salon":        [`hair salons${tail}`, `nail salons${tail}`],
    "barbershop":   [`barber shops${tail}`, `men's haircuts${tail}`],
    "laundromat":   [`laundromats${tail}`, `wash and fold${tail}`],
    "pharmacy":     [`pharmacies${tail}`, `drug stores${tail}`],
    "daycare":      [`daycares${tail}`, `childcare${tail}`],
    "auto repair":  [`auto repair shops${tail}`, `mechanics${tail}`],
    "liquor store": [`liquor stores${tail}`, `wine and spirits${tail}`]
  };
  return queriesByType[type] || [`${type}s${tail}`, `${type}${tail}`];
}

function formatApifyHours(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((h) => `${h.day || h.weekDay || ""}: ${h.hours || h.openTime || ""}`.trim())
      .filter((line) => line && line !== ":")
      .join("; ");
  }
  return "";
}

function apifyCompetitorScore(item) {
  const rating = Number(item.rating) || 0;
  const reviews = Math.log10(Math.max(10, Number(item.reviews) || 10));
  return rating * 18 + reviews * 12;
}

async function fetchMarketScan(profile) {
  if (process.env.APIFY_PLACES_DISABLED !== "1" && (process.env.APIFY_TOKEN || scalekitConfiguredForTools())) {
    try {
      const apifyResult = await fetchApifyPlaces(profile);
      if (apifyResult?.ok && apifyResult.count > 0) return apifyResult;
    } catch (error) {
      console.warn(`Apify places scan failed, falling back to Overpass: ${error.message}`);
    }
  }

  const radius = localBusinessRadiusMeters(profile, 4800);
  const sourceUrl = googleMapsSearchUrl(competitorSearchQueries(profile)[0], profile);
  const query = `
    [out:json][timeout:18];
    (
      node(around:${Math.round(radius)},${profile.lat},${profile.lon})["shop"];
      node(around:${Math.round(radius)},${profile.lat},${profile.lon})["amenity"~"restaurant|cafe|fast_food|bar|pub|pharmacy|bank|fuel|clinic|school|childcare",i];
    );
    out tags center 220;
  `;
  const technicalUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try {
    const data = await fetchJson(technicalUrl, {
      headers: { "User-Agent": APP_USER_AGENT }
    }, 18000);
    const elements = Array.isArray(data.elements) ? data.elements : [];
    const items = elements.map((element) => {
      const tags = element.tags || {};
      const category = tags.shop || tags.amenity || "business";
      return {
        name: tags.name || labelForType(category),
        category,
        cuisine: tags.cuisine || "",
        openingHours: tags.opening_hours || "",
        lat: Number(element.lat || element.center?.lat),
        lon: Number(element.lon || element.center?.lon),
        url: googleMapsSearchUrl(`${tags.name || labelForType(category)} ${profile.city || ""}`, { ...profile, lat: Number(element.lat || element.center?.lat), lon: Number(element.lon || element.center?.lon) })
      };
    })
      .filter((item) => item.name && item.category)
      .map((item) => ({ ...item, distanceMeters: distanceMeters(profile.lat, profile.lon, item.lat, item.lon) }))
      .filter((item) => Number.isFinite(item.distanceMeters) && item.distanceMeters <= radius);
    const categories = topCounts(items.map((item) => item.category), 8);
    const sameCategory = competitorCategories(profile.businessType);
    const competitors = items
      .filter((item) => sameCategory.some((term) => String(item.category).toLowerCase().includes(term)))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 15);
    return {
      ok: true,
      sourceUrl,
      technicalUrl,
      items: competitors,
      count: items.length,
      summary: {
        radiusMeters: radius,
        topCategories: categories,
        competitorCount: competitors.length,
        sampleCompetitors: competitors.slice(0, 6)
      },
      message: `${profile.city || "City"} fallback map scan found ${competitors.length} relevant nearby competitors.`
    };
  } catch (error) {
    return {
      ok: false,
      sourceUrl,
      technicalUrl,
      items: [],
      count: 0,
      error: error.message,
      message: "City scan did not return in time; other checks still ran."
    };
  }
}

function localBusinessRadiusMeters(profile, fallback = 4500) {
  const configured = Number(process.env.WARDEN_LOCAL_RADIUS_METERS);
  if (Number.isFinite(configured) && configured > 500) return clamp(configured, 800, 12000);
  const local = Number(profile.localRadiusMeters);
  if (Number.isFinite(local) && local > 500 && local < 12000) return local;
  const stored = Number(profile.radiusMeters);
  if (Number.isFinite(stored) && stored > 500 && stored < 12000) return stored;
  return fallback;
}

function googleMapsSearchUrl(query, profile = {}) {
  const text = String(query || "").trim() || [profile.businessName, profile.address, profile.city].filter(Boolean).join(" ");
  const params = new URLSearchParams({ api: "1", query: text });
  const lat = Number(profile.lat);
  const lon = Number(profile.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    params.set("query", `${text} @${lat.toFixed(6)},${lon.toFixed(6)}`);
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function googleMapsUrlFromPlace(place, profile) {
  const direct = place.url || place.googleUrl || place.placeUrl || place.googleMapsUrl || "";
  if (/google\.[^/]+\/maps|maps\.app\.goo\.gl/i.test(String(direct))) return direct;
  const name = place.title || place.name || "business";
  const address = place.address || [profile.city, profile.state].filter(Boolean).join(", ");
  const lat = Number(place.location?.lat ?? place.lat);
  const lon = Number(place.location?.lng ?? place.lon ?? place.lng);
  return googleMapsSearchUrl([name, address].filter(Boolean).join(" "), { ...profile, lat, lon });
}

async function getScalekitStaticToken({ connectorPattern, providerPattern }) {
  if (!scalekitConfiguredForTools()) return "";
  try {
    const payload = await scalekitApi("/api/v1/connected_accounts?page_size=30");
    const account = connectedAccountsFromPayload(payload).find((item) =>
      /active/i.test(String(item.status || "")) &&
      (connectorPattern.test(String(item.connector || item.connection_name || item.connector_name || "")) ||
        providerPattern.test(String(item.provider || "")))
    );
    if (!account?.id) return "";
    const detail = await scalekitApi(`/api/v1/connected_accounts/${encodeURIComponent(account.id)}`);
    const staticAuth = detail?.connected_account?.authorization_details?.static_auth?.details || {};
    return staticAuth.token || staticAuth.api_token || staticAuth.apiKey || staticAuth.api_key || "";
  } catch (error) {
    console.warn(`Scalekit static token lookup failed: ${error.message}`);
    return "";
  }
}

async function fetchCitySafety(profile) {
  const city = profile.city || profile.locationLabel || "local";
  const query = `("${city}") (crime OR theft OR robbery OR burglary OR police OR fire OR "power outage" OR "public safety" OR "road closure")`;
  return fetchArticleScan(profile, query, "City safety scan", ["police", "fire", "crime", "outage", city], 30);
}

async function fetchCityInfrastructure(profile) {
  const city = profile.city || profile.locationLabel || "local";
  const query = `("${city}") (construction OR "road closure" OR "public works" OR transit OR utility OR outage OR "water main" OR sidewalk OR parking)`;
  return fetchArticleScan(profile, query, "City infrastructure scan", ["construction", "public works", "outage", "road", city], 30);
}

async function fetchCityEconomy(profile) {
  const city = profile.city || profile.locationLabel || "local";
  const terms = businessNewsTerms(profile.businessType);
  const query = `("${city}") (development OR apartments OR opening OR closure OR "small business" OR campus OR tourism OR "foot traffic" OR ${terms.join(" OR ")})`;
  return fetchArticleScan(profile, query, "City economy scan", ["development", "opening", "business", "campus", city], 45);
}

async function fetchArticleScan(profile, query, label, terms, days = 30) {
  const publicUrl = `https://news.google.com/search?${new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en"
  })}`;
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    format: "json",
    maxrecords: "25",
    sort: "HybridRel",
    timespan: `${days}d`
  });
  const sourceUrl = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  try {
    const data = await fetchJson(sourceUrl, {}, 10000);
    const articles = currentOrFutureArticles(localizeArticles((data.articles || []).map((article) => ({
      title: article.title,
      url: article.url,
      domain: article.domain,
      sourceCountry: article.sourcecountry,
      language: article.language,
      seenAt: article.seendate,
      socialImage: article.socialimage,
      tone: article.tone
    })), newsLocationTerms(profile)));
    return { ok: true, sourceUrl: publicUrl, technicalUrl: sourceUrl, articles, count: articles.length, message: `${label} via GDELT for ${profile.city || profile.locationLabel}` };
  } catch (error) {
    const rssUrl = `https://news.google.com/rss/search?${new URLSearchParams({
      q: query,
      hl: "en-US",
      gl: "US",
      ceid: "US:en"
    })}`;
    const xml = await fetchText(rssUrl, {}, 10000);
    const articles = currentOrFutureArticles(localizeArticles(parseRssItems(xml), uniqueStrings([...newsLocationTerms(profile), ...terms]))).slice(0, 20);
    return {
      ok: true,
      sourceUrl: publicUrl,
      technicalUrl: rssUrl,
      articles,
      count: articles.length,
      message: `${label} via Google News RSS after GDELT issue: ${error.message.slice(0, 90)}`
    };
  }
}

async function fetchLivePlaceLookup(profile, query) {
  const cleanQuery = String(query || "").replace(/\s+/g, " ").trim();
  if (!cleanQuery) return { ok: false, provider: "none", places: [], message: "No lookup query" };
  const [apify, osm] = await Promise.all([
    fetchApifyLookupPlaces(profile, cleanQuery).catch((error) => ({ ok: false, places: [], message: error.message })),
    fetchNominatimPlaces(profile, cleanQuery).catch((error) => ({ ok: false, places: [], message: error.message }))
  ]);
  const places = uniquePlaces([...(apify.places || []), ...(osm.places || [])])
    .sort((a, b) => lookupPlaceScore(b, cleanQuery, profile) - lookupPlaceScore(a, cleanQuery, profile))
    .slice(0, 6);
  return {
    ok: places.length > 0,
    provider: apify.places?.length ? "apify-google-places" : "openstreetmap",
    places,
    sourceUrl: apify.sourceUrl || osm.sourceUrl || googleMapsSearchUrl(cleanQuery, profile),
    message: places.length
      ? `Found ${places.length} place result(s) for ${cleanQuery}`
      : `No place result found for ${cleanQuery}`
  };
}

async function fetchApifyLookupPlaces(profile, query) {
  if (!process.env.APIFY_TOKEN && !scalekitConfiguredForTools()) {
    return { ok: false, provider: "apify", places: [], message: "Apify is not connected" };
  }
  const actorId = process.env.APIFY_PLACES_ACTOR || "compass/crawler-google-places";
  const max = Math.min(8, Number(process.env.APIFY_LOOKUP_MAX_PLACES || 5));
  const cityLine = [profile.city, profile.state || "", "USA"].filter(Boolean).join(", ");
  const searchQuery = [query, cityLine].filter(Boolean).join(" ");
  const sourceUrl = googleMapsSearchUrl(searchQuery, profile);
  const cacheKey = ["lookup", "v1", actorId, searchQuery.toLowerCase()].join("|");
  const cached = APIFY_PLACES_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < APIFY_PLACES_TTL_MS) return cached.payload;

  const input = {
    searchStringsArray: [searchQuery, query],
    maxCrawledPlacesPerSearch: max,
    language: "en",
    skipClosedPlaces: false,
    additionalInfo: true,
    scrapePlaceDetailPage: true
  };
  if (Number.isFinite(Number(profile.lat)) && Number.isFinite(Number(profile.lon))) {
    input.customGeolocation = {
      type: "Point",
      coordinates: [Number(profile.lon), Number(profile.lat)],
      radiusKm: Number(process.env.APIFY_LOOKUP_RADIUS_KM || 30)
    };
  }
  if (cityLine) input.locationQuery = cityLine;

  const result = await runApifyActor(actorId, input, Number(process.env.APIFY_PLACES_TIMEOUT_MS || 25000));
  if (!result.ok) return { ok: false, provider: "apify", sourceUrl, places: [], message: result.error || "Apify lookup failed" };
  const places = (result.items || [])
    .map((item) => normalizeLookupPlace(item, profile, "Apify Google Places"))
    .filter((place) => place.name && place.category)
    .slice(0, max);
  const payload = { ok: places.length > 0, provider: "apify", sourceUrl, actorId, places, count: places.length };
  APIFY_PLACES_CACHE.set(cacheKey, { at: Date.now(), payload });
  persistPlacesCache();
  return payload;
}

async function fetchNominatimPlaces(profile, query) {
  const cityLine = [profile.city, profile.state || "", "USA"].filter(Boolean).join(", ");
  const q = [query, cityLine].filter(Boolean).join(", ");
  const sourceUrl = `https://www.openstreetmap.org/search?${new URLSearchParams({ query: q })}`;
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "5",
    addressdetails: "1",
    extratags: "1",
    namedetails: "1"
  })}`;
  const data = await fetchJson(url, { headers: { "User-Agent": APP_USER_AGENT } }, 9000);
  const places = (Array.isArray(data) ? data : [])
    .map((item) => normalizeNominatimPlace(item, profile))
    .filter((place) => place.name)
    .slice(0, 5);
  return { ok: places.length > 0, provider: "openstreetmap", sourceUrl, places, count: places.length };
}

async function fetchOpenWebLookup(profile, query) {
  const cleanQuery = String(query || "").replace(/\s+/g, " ").trim();
  if (!cleanQuery) return { ok: false, articles: [], message: "No web query" };
  const cityLine = [profile.city, profile.state].filter(Boolean).join(" ");
  const localizedQuery = [cleanQuery, cityLine].filter(Boolean).join(" ");
  const [duck, wikipedia, news] = await Promise.all([
    fetchDuckDuckGoSummary(localizedQuery).catch((error) => ({ ok: false, message: error.message })),
    fetchWikipediaSummary(cleanQuery).catch((error) => ({ ok: false, message: error.message })),
    fetchLookupNews(profile, cleanQuery).catch((error) => ({ ok: false, articles: [], message: error.message }))
  ]);
  const abstract = duck.abstract || wikipedia.extract || "";
  return {
    ok: Boolean(abstract || wikipedia.title || news.articles?.length),
    query: cleanQuery,
    abstract,
    abstractUrl: duck.url || wikipedia.url || "",
    wikipedia: wikipedia.title ? wikipedia : null,
    articles: news.articles || [],
    news: news.articles || [],
    sourceUrl: news.sourceUrl || duck.url || wikipedia.url || "",
    message: [duck.message, wikipedia.message, news.message].filter(Boolean).join(" · ")
  };
}

async function fetchDuckDuckGoSummary(query) {
  const url = `https://api.duckduckgo.com/?${new URLSearchParams({
    q: query,
    format: "json",
    no_html: "1",
    skip_disambig: "1"
  })}`;
  const data = await fetchJson(url, { headers: { "User-Agent": APP_USER_AGENT } }, 9000);
  const abstract = String(data.AbstractText || data.Abstract || data.Heading || "").replace(/\s+/g, " ").trim();
  const related = flattenDuckTopics(data.RelatedTopics || []).slice(0, 5);
  return {
    ok: Boolean(abstract || related.length),
    abstract,
    url: data.AbstractURL || data.Results?.[0]?.FirstURL || "",
    related,
    message: abstract ? "DuckDuckGo instant answer found" : "DuckDuckGo returned related topics only"
  };
}

async function fetchWikipediaSummary(query) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    format: "json",
    origin: "*",
    srlimit: "1"
  })}`;
  const search = await fetchJson(searchUrl, { headers: { "User-Agent": APP_USER_AGENT } }, 9000);
  const title = search?.query?.search?.[0]?.title;
  if (!title) return { ok: false, message: "No Wikipedia match" };
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summary = await fetchJson(summaryUrl, { headers: { "User-Agent": APP_USER_AGENT } }, 9000);
  return {
    ok: Boolean(summary.extract),
    title: summary.title || title,
    extract: String(summary.extract || "").replace(/\s+/g, " ").trim(),
    url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s/g, "_"))}`,
    message: "Wikipedia summary found"
  };
}

async function fetchLookupNews(profile, query) {
  const locationTerms = newsLocationTerms(profile);
  const cityLine = locationTerms.map((term) => `"${term}"`).join(" OR ");
  const q = cityLine ? `("${query}" OR ${query}) (${cityLine})` : `"${query}"`;
  const rssUrl = `https://news.google.com/rss/search?${new URLSearchParams({
    q,
    hl: "en-US",
    gl: "US",
    ceid: "US:en"
  })}`;
  const xml = await fetchText(rssUrl, {}, 10000);
  const articles = localizeArticles(parseRssItems(xml), [query, ...locationTerms]).slice(0, 10);
  return { ok: articles.length > 0, sourceUrl: rssUrl, articles, count: articles.length, message: `News lookup for ${query}` };
}

function normalizeLookupPlace(raw, profile, source) {
  const lat = Number(raw.location?.lat ?? raw.lat);
  const lon = Number(raw.location?.lng ?? raw.lon ?? raw.lng);
  const place = {
    name: String(raw.title || raw.name || "").trim(),
    category: raw.categoryName || raw.category || (Array.isArray(raw.categories) ? raw.categories[0] : "") || "business",
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    openingHours: formatApifyHours(raw.openingHours),
    rating: Number(raw.totalScore ?? raw.rating) || null,
    reviews: Number(raw.reviewsCount ?? raw.reviews) || null,
    price: typeof raw.price === "string" ? raw.price.trim() : "",
    description: typeof raw.description === "string" ? raw.description : "",
    phone: raw.phone || raw.phoneUnformatted || "",
    website: raw.website || "",
    address: raw.address || "",
    lat,
    lon,
    url: googleMapsUrlFromPlace(raw, profile),
    source
  };
  return {
    ...place,
    distanceMeters: distanceMeters(profile.lat, profile.lon, lat, lon)
  };
}

function normalizeNominatimPlace(raw, profile) {
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  const tags = raw.extratags || {};
  const address = raw.address || {};
  const name = raw.namedetails?.name || raw.name || String(raw.display_name || "").split(",")[0] || "";
  const category = tags.cuisine || raw.type || raw.class || "place";
  return {
    name: String(name).trim(),
    category,
    categories: [raw.class, raw.type].filter(Boolean),
    openingHours: tags.opening_hours || "",
    rating: null,
    reviews: null,
    price: "",
    description: raw.display_name || "",
    phone: tags.phone || "",
    website: tags.website || "",
    address: [address.house_number, address.road, address.city || address.town || address.village, address.state].filter(Boolean).join(", ") || raw.display_name || "",
    lat,
    lon,
    url: googleMapsSearchUrl(raw.display_name || name, { ...profile, lat, lon }),
    source: "OpenStreetMap",
    distanceMeters: distanceMeters(profile.lat, profile.lon, lat, lon)
  };
}

function uniquePlaces(places = []) {
  const seen = new Set();
  const out = [];
  for (const place of places) {
    const key = `${String(place.name || "").toLowerCase()}|${String(place.address || "").toLowerCase()}`;
    if (!place.name || seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

function lookupPlaceScore(place, query, profile) {
  const haystack = `${place.name || ""} ${place.category || ""} ${place.address || ""}`.toLowerCase();
  const terms = String(query || "").toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  const termScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 12 : 0), 0);
  const ratingScore = Number(place.rating || 0) * 2;
  const reviewScore = Math.min(10, Math.log10(Number(place.reviews || 0) + 1) * 4);
  const distance = Number(place.distanceMeters);
  const distanceScore = Number.isFinite(distance) ? Math.max(0, 12 - distance / 1600) : 0;
  const cityScore = profile.city && haystack.includes(String(profile.city).toLowerCase()) ? 6 : 0;
  return termScore + ratingScore + reviewScore + distanceScore + cityScore;
}

function flattenDuckTopics(topics = []) {
  const rows = [];
  for (const item of topics || []) {
    if (item.Text || item.FirstURL) rows.push({ title: item.Text || "", url: item.FirstURL || "" });
    if (Array.isArray(item.Topics)) rows.push(...flattenDuckTopics(item.Topics));
  }
  return rows;
}

async function fetchNews(profile) {
  const typeTerms = businessNewsTerms(profile.businessType);
  const trendTerms = cityTrendTerms(profile.businessType);
  const locationTerms = newsLocationTerms(profile);
  const locationQuery = locationTerms.map((term) => `"${term}"`).join(" OR ") || `"${profile.city || profile.address}"`;
  const query = `(${locationQuery}) (${typeTerms.join(" OR ")} OR ${trendTerms.join(" OR ")})`;
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    format: "json",
    maxrecords: "35",
    sort: "HybridRel",
    timespan: "14d"
  });
  const sourceUrl = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  try {
    const data = await fetchJson(sourceUrl, {}, 10000);
    const articles = currentOrFutureArticles(localizeArticles((data.articles || []).map((article) => ({
      title: article.title,
      url: article.url,
      domain: article.domain,
      sourceCountry: article.sourcecountry,
      language: article.language,
      seenAt: article.seendate,
      socialImage: article.socialimage,
      tone: article.tone
    })), locationTerms));
    return { ok: true, sourceUrl, articles, count: articles.length, message: `GDELT localized to ${locationTerms.join(", ")}` };
  } catch (error) {
    const rssQuery = `(${locationQuery}) (${typeTerms.join(" OR ")} OR ${trendTerms.join(" OR ")})`;
    const rssUrl = `https://news.google.com/rss/search?${new URLSearchParams({
      q: rssQuery,
      hl: "en-US",
      gl: "US",
      ceid: "US:en"
    })}`;
    const xml = await fetchText(rssUrl, {}, 10000);
    const parsed = parseRssItems(xml);
    const articles = currentOrFutureArticles(localizeArticles(parsed, locationTerms)).slice(0, 25);
    return {
      ok: true,
      sourceUrl: rssUrl,
      articles,
      count: articles.length,
      message: `Google News RSS localized to ${locationTerms.join(", ")} after GDELT issue: ${error.message.slice(0, 90)}`
    };
  }
}

async function fetchRegulatoryUpdates(profile) {
  const typeTerms = regulatoryTerms(profile.businessType);
  const locationTerms = newsLocationTerms(profile);
  const locationQuery = locationTerms.map((term) => `"${term}"`).join(" OR ") || `"${profile.city || profile.state || "California"}"`;
  const query = `(${locationQuery} OR "California") (${typeTerms.join(" OR ")} OR permit OR license OR inspection OR "minimum wage" OR "new law" OR ordinance OR compliance)`;
  const rssUrl = `https://news.google.com/rss/search?${new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en"
  })}`;
  const xml = await fetchText(rssUrl, {}, 10000);
  const articles = currentOrFutureArticles(localizeArticles(parseRssItems(xml), [...locationTerms, "California"])).slice(0, 20);
  const officialItems = officialRegulatoryItems(profile);
  return {
    ok: true,
    sourceUrl: rssUrl,
    articles,
    items: [...officialItems, ...articles],
    count: officialItems.length + articles.length,
    message: `Regulatory watch localized to ${[...locationTerms, profile.state || "California"].filter(Boolean).join(", ")}`
  };
}

async function fetchLocalEvents(profile) {
  const typeTerms = businessNewsTerms(profile.businessType);
  const locationTerms = newsLocationTerms(profile);
  const locationQuery = locationTerms.map((term) => `"${term}"`).join(" OR ") || `"${profile.city || profile.address}"`;
  const query = `(${locationQuery}) ("Super Bowl" OR festival OR concert OR convention OR game OR parade OR campus OR "large event" OR footfall OR tourism OR ${typeTerms.join(" OR ")})`;
  const rssUrl = `https://news.google.com/rss/search?${new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en"
  })}`;
  const xml = await fetchText(rssUrl, {}, 10000);
  const articles = currentOrFutureArticles(localizeArticles(parseRssItems(xml), locationTerms)).slice(0, 20);
  return {
    ok: true,
    sourceUrl: rssUrl,
    articles,
    count: articles.length,
    message: `Event watch localized to ${locationTerms.join(", ")}`
  };
}

async function fetchEarthquakes(profile) {
  const sourceUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";
  const data = await fetchJson(sourceUrl, {}, 9000);
  const items = (data.features || [])
    .map((feature) => {
      const [lon, lat, depthKm] = feature.geometry?.coordinates || [];
      const p = feature.properties || {};
      return {
        title: p.title,
        place: p.place,
        magnitude: p.mag,
        when: p.time ? new Date(p.time).toISOString() : null,
        url: p.url,
        lat,
        lon,
        depthKm,
        distanceMeters: distanceMeters(profile.lat, profile.lon, lat, lon)
      };
    })
    .filter((row) => Number.isFinite(row.distanceMeters) && row.distanceMeters <= 250000)
    .sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0))
    .slice(0, 10);
  return { ok: true, sourceUrl, items, count: items.length };
}

async function fetchNaturalEvents(profile) {
  const bbox = bboxAround(profile.lat, profile.lon, 4);
  const params = new URLSearchParams({
    status: "open",
    days: "30",
    category: "wildfires,severeStorms,volcanoes",
    bbox: `${bbox.minLon},${bbox.maxLat},${bbox.maxLon},${bbox.minLat}`
  });
  const sourceUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?${params}`;
  const data = await fetchJson(sourceUrl, {}, 9000);
  const events = (data.events || []).map((event) => ({
    id: event.id,
    title: event.title,
    categories: (event.categories || []).map((c) => c.title).join(", "),
    sources: (event.sources || []).map((s) => ({ id: s.id, url: s.url })),
    link: event.link,
    closed: event.closed,
    geometry: event.geometry?.slice?.(-1)?.[0] || null
  }));
  return { ok: true, sourceUrl, events, count: events.length };
}

async function runApifyActor(actorId, input, timeoutMs = 240000) {
  const token = process.env.APIFY_TOKEN || await getScalekitStaticToken({
    connectorPattern: /apify/i,
    providerPattern: /apify/i
  });
  if (!token) {
    return {
      ok: false,
      error: "No active Apify token found in local env or Scalekit connected accounts.",
      next: "Connect Apify in Scalekit or add APIFY_TOKEN to .env when you want Actor-backed sources."
    };
  }

  const apiActorId = actorId.replace("/", "~");
  const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(apiActorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  try {
    const items = await fetchJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    }, timeoutMs);
    return { ok: true, actorId, count: Array.isArray(items) ? items.length : 0, items };
  } catch (error) {
    return { ok: false, actorId, error: error.message };
  }
}

async function fetchSocrata(url) {
  const headers = { "User-Agent": APP_USER_AGENT };
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  return fetchJson(url, { headers }, 10000);
}

async function fetchJson(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} from ${shortUrl(url)} ${text.slice(0, 160)}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: { "User-Agent": APP_USER_AGENT, ...(options.headers || {}) },
      signal: controller.signal
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} from ${shortUrl(url)} ${text.slice(0, 160)}`);
    }
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseRssItems(xml) {
  const blocks = [...String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return blocks.map((block) => {
    const title = decodeXml(tagValue(block, "title"));
    const url = decodeXml(tagValue(block, "link"));
    const pubDate = tagValue(block, "pubDate");
    const source = decodeXml(tagValue(block, "source"));
    return {
      title,
      url,
      domain: source || safeDomain(url),
      sourceCountry: "US",
      language: "English",
      seenAt: pubDate ? new Date(pubDate).toISOString() : null
    };
  }).filter((item) => item.title && item.url);
}

function tagValue(block, tag) {
  const match = String(block || "").match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function synthesizeSignals(profile, feeds) {
  const signals = [];
  const banners = [];
  const recommendations = [];
  const maxOwnerOpportunities = 14;
  const maxOwnerWarnings = 14;

  addWeatherSignals(signals, banners, recommendations, feeds.weather, feeds.alerts);
  addAirSignals(signals, feeds.air);
  addSafetySignals(signals, banners, recommendations, feeds.police, feeds.citySafety, profile);
  add311Signals(signals, recommendations, feeds.cases311, feeds.cityInfrastructure, profile);
  addMarketSignals(signals, recommendations, feeds.marketScan, feeds.cityEconomy, profile);
  addNewsSignals(signals, recommendations, feeds.news, profile, feeds);
  addRegulatorySignals(signals, banners, recommendations, feeds.regulatory, profile);
  addEventSignals(signals, recommendations, feeds.localEvents, profile);
  addHazardSignals(signals, feeds.earthquakes, feeds.eonet);

  if (signals.length === 0) {
    signals.push(seedSignal("system", "info", "City checks unavailable", "Try again later", "The city checks did not return enough information. Refresh before making staffing, inventory or safety decisions.", "Righthand AI"));
  }

  const risk = clamp(24 + signals.filter((s) => s.severity === "critical").length * 18 + signals.filter((s) => s.severity === "warning").length * 9, 8, 98);
  const opportunity = clamp(28 + signals.filter((s) => s.severity === "opportunity").length * 12 + Math.min(signals.length, 18) * 2, 10, 96);
  const opportunities = buildOpportunities(profile, feeds, signals, maxOwnerOpportunities);
  const warningSignals = signals.filter((s) => s.severity === "critical" || s.severity === "warning");
  const warnings = buildWarnings(profile, feeds, warningSignals, maxOwnerWarnings);

  // Note: we no longer re-push opportunities into the signals array.
  // The Opportunities and Warnings panels render their own dedicated cards above
  // the Signals section, so duplicating them in the grouped Signals view caused
  // the same Crime/Safety + market cards to appear twice.

  // Dedupe signals within each group by normalized headline so two near-identical
  // safety articles don't both render as separate cards.
  const dedupedSignals = dedupeSignalsByHeadline(signals);
  const groups = groupSignals(dedupedSignals);
  const sortedBanners = banners.slice(0, 4);

  if (!sortedBanners.length) {
    sortedBanners.push({
      level: "opportunity",
      title: "No urgent issue found right now",
      body: `Use the forecast, permit checklist and local cards below to decide staffing, inventory and safety checks for this week.`
    });
  }

  return {
    scores: { risk, opportunity },
    banners: sortedBanners,
    groups,
    recommendations: recommendations.slice(0, 6),
    metrics: buildMetrics(profile, feeds, signals, opportunities, warnings),
    opportunities,
    warnings
  };
}

function addWeatherSignals(signals, banners, recommendations, weather, alerts) {
  const activeAlerts = alerts?.items || [];
  for (const alert of activeAlerts.slice(0, 3)) {
    const severity = /extreme|severe/i.test(alert.severity || "") ? "critical" : "warning";
    const when = dateRangeLabel(alert.effective, alert.expires) || "Now";
    signals.push(signal({
      group: "Weather and Climate",
      severity,
      code: "WX",
      name: "Weather alert",
      headline: alert.event || "Weather alert",
      metric: alert.severity || "Active",
      body: alert.headline || alert.instruction || "Active National Weather Service alert for this point.",
      source: "National Weather Service",
      url: alert.url,
      when
    }));
    banners.push({
      level: severity,
      title: `${alert.event || "Weather alert"} - ${alert.severity || "Active"}`,
      body: alert.headline || "Review staffing, sidewalk signage, delivery demand and perishable inventory."
    });
  }

  if (!weather?.ok) return;
  const current = weather.current || {};
  const daily = weather.daily || {};
  const maxRain = max(daily.precipitation_probability_max);
  const maxTemp = max(daily.temperature_2m_max);
  const maxWind = max(daily.wind_speed_10m_max);
  const temp = current.temperature_2m;
  const weatherWhen = forecastPeakLabel(daily, daily.precipitation_probability_max, "rain") || forecastPeakLabel(daily, daily.temperature_2m_max, "heat") || "Next 7 days";

  signals.push(signal({
    group: "Weather and Climate",
    severity: temp >= 85 || maxRain >= 60 ? "warning" : "info",
    code: "WX",
    name: "Local forecast",
    headline: Number.isFinite(temp) ? `${Math.round(temp)} F right now` : "Weekly weather",
    metric: maxRain >= 60 ? `${Math.round(maxRain)}% rain chance` : "7 day outlook",
    body: `Plan the week around a high near ${numberOrDash(maxTemp)} F, rain chance up to ${numberOrDash(maxRain)}%, and wind up to ${numberOrDash(maxWind)} mph. Use this for staffing, outdoor setup, delivery messaging and perishable ordering.`,
    source: "Open-Meteo",
    url: weather.sourceUrl,
    when: weatherWhen
  }));

  if (maxRain >= 60) {
    recommendations.push("Prep delivery promos and staffing for rain-sensitive foot traffic.");
  }
  if (maxTemp >= 85) {
    recommendations.push("Stock cold drinks and check HVAC load before the hottest afternoon.");
  }
}

function addAirSignals(signals, air) {
  if (!air?.ok) return;
  const current = air.current || {};
  const aqi = Number(current.us_aqi);
  const pm25 = Number(current.pm2_5);
  let severity = "opportunity";
  if (aqi > 150) severity = "critical";
  else if (aqi > 100) severity = "warning";
  else if (aqi > 50) severity = "info";

  signals.push(signal({
    group: "Weather and Climate",
    severity,
    code: "AQ",
    name: "Air quality",
    headline: Number.isFinite(aqi) ? `AQI ${Math.round(aqi)}` : "AQI",
    metric: Number.isFinite(pm25) ? `PM2.5 ${pm25.toFixed(1)}` : "Current",
    body: severity === "opportunity"
      ? "Outdoor traffic should not be limited by air quality right now. Patio, sidewalk signage and walk-up demand can stay in the normal plan."
      : "Air quality may reduce outdoor traffic. Consider delivery messaging, staff exposure planning and limiting outdoor setup.",
    source: "Open-Meteo Air Quality",
    url: air.sourceUrl
  }));
}

function addSafetySignals(signals, banners, recommendations, police, citySafety, profile) {
  const items = police?.items || [];
  const safetyArticles = ownerRelevantArticles(currentOrFutureArticles(citySafety?.articles || []), profile);

  if (items.length) {
    const categories = topCounts(items.map((item) => item.title), 3);
    const severity = items.length >= 12 ? "critical" : items.length >= 5 ? "warning" : "info";
    signals.push(signal({
      group: "Crime and Safety",
      severity,
      code: "CR",
      name: "City incident reports",
      headline: `${items.length} recent reports`,
      metric: `${Math.round(profile.radiusMeters / 1609 * 10) / 10} mi area`,
      body: `Recent nearby reports were mostly ${categories.map((c) => `${c.label} (${c.count})`).join(", ")}. Closest report was about ${Math.round(items[0].distanceMeters)}m away near ${items[0].place}. Review closing, lighting and cash-handling if this overlaps your store hours.`,
      source: "DataSF SFPD",
      url: police.sourceUrl
    }));

    if (severity !== "info") {
      banners.push({
        level: severity,
        title: `${items.length} recent police reports near this store`,
        body: "Review opening/closing routines, lighting, cameras and staff walkout procedures."
      });
      recommendations.push("Add a safety checklist for closing shift and check exterior lighting.");
    }
  }

  if (safetyArticles.length) {
    for (const article of safetyArticles.slice(0, 3)) {
      const insight = ownerArticleInsight(article, profile, "Crime and Safety");
      signals.push(signal({
        group: "Crime and Safety",
        severity: insight.severity === "opportunity" ? "info" : insight.severity,
        code: "SAFE",
        name: insight.name,
        headline: insight.headline,
        metric: insight.metric,
        body: insight.body,
        source: "Local safety news",
        url: article.url,
        when: article.when,
        action: insight.action,
        pointers: insight.pointers,
        evidenceTitle: insight.evidenceTitle,
        ownerReady: true
      }));
    }
    if (safetyArticles.some((article) => /(theft|robbery|burglary|fire|outage|closure|police)/i.test(article.title || ""))) {
      recommendations.push("Review this week’s city safety items before changing store hours or closing shift coverage.");
    }
    return;
  }

  signals.push(signal({
    group: "Crime and Safety",
    severity: "info",
    code: "SAFE",
    name: "City safety coverage",
    headline: "No major safety issue found",
    metric: profile.city || "city-wide",
    body: "No obvious city safety item appeared in the latest check. Keep normal closing routines, lighting checks and cash-handling procedures.",
    source: citySafety?.sourceUrl ? "Local safety news" : "Righthand AI",
    url: citySafety?.sourceUrl || police?.sourceUrl
  }));
}

function add311Signals(signals, recommendations, cases311, cityInfrastructure, profile) {
  const items = cases311?.items || [];
  const articles = ownerRelevantArticles(currentOrFutureArticles(cityInfrastructure?.articles || []), profile);

  if (items.length) {
    const openCount = items.filter((item) => !/closed/i.test(item.status || "")).length;
    const categories = topCounts(items.map((item) => item.title), 3);
    const severity = openCount >= 10 ? "warning" : "info";
    signals.push(signal({
      group: "Infrastructure",
      severity,
      code: "311",
      name: "Street and city cases",
      headline: `${openCount} open city cases`,
      metric: `${items.length} recent cases`,
      body: `Nearby city cases are mostly ${categories.map((c) => `${c.label} (${c.count})`).join(", ")}. Closest case was about ${Math.round(items[0].distanceMeters)}m away at ${items[0].place}. Check customer access, curb pickup and delivery routes if this is near your block.`,
      source: "DataSF 311",
      url: cases311.sourceUrl
    }));
    if (openCount >= 5) recommendations.push("Check sidewalk access and storefront approach before peak traffic.");
  }

  if (articles.length) {
    for (const article of articles.slice(0, 3)) {
      const insight = ownerArticleInsight(article, profile, "Infrastructure");
      signals.push(signal({
        group: "Infrastructure",
        severity: insight.severity === "opportunity" ? "info" : insight.severity,
        code: "INF",
        name: insight.name,
        headline: insight.headline,
        metric: insight.metric,
        body: insight.body,
        source: "Local infrastructure news",
        url: article.url,
        when: article.when,
        action: insight.action,
        pointers: insight.pointers,
        evidenceTitle: insight.evidenceTitle,
        ownerReady: true
      }));
    }
    if (articles.some((article) => /(outage|closure|construction|traffic|water main)/i.test(article.title || ""))) {
      recommendations.push("Check delivery routes, curb access and staff commute impact before the next peak period.");
    }
    return;
  }

  if (!items.length) {
    signals.push(signal({
      group: "Infrastructure",
      severity: "info",
      code: "INF",
      name: "City infrastructure coverage",
      headline: "No major access issue found",
      metric: profile.city || "city-wide",
      body: "No obvious road, utility or access issue appeared in the latest check. Keep normal delivery and curb-pickup plans.",
      source: cityInfrastructure?.sourceUrl ? "Local infrastructure news" : "Righthand AI",
      url: cityInfrastructure?.sourceUrl || cases311?.sourceUrl
    }));
  }
}

function addMarketSignals(signals, recommendations, marketScan, cityEconomy, profile) {
  const summary = marketScan?.summary;
  if (summary) {
    const top = summary.topCategories || [];
    const samples = (summary.sampleCompetitors || []).map((item) => item.name).filter(Boolean).slice(0, 4);
    const density = marketScan.count >= 90 ? "Busy area" : marketScan.count >= 35 ? "Moderate activity" : "Limited map data";
    signals.push(signal({
      group: "Market and Competition",
      severity: samples.length >= 2 ? "opportunity" : "info",
      code: "MKT",
      name: "City market map",
      headline: samples.length ? `${summary.competitorCount} comparable places nearby` : "Check your online visibility",
      metric: density,
      body: samples.length
        ? `Customers may compare you with places like ${samples.join(", ")}. Check their hours, photos, menu/service clarity and one offer you can beat this week.`
        : `The map did not show many clearly comparable places. Make sure your listing, hours, photos and menu/service details are easy to find.`,
      source: "City map",
      url: marketScan.sourceUrl
    }));
    recommendations.push("Compare nearby listings and make one visible improvement: hours, photos, menu/service details, or a simple offer.");
  }

  const economyArticles = ownerRelevantArticles(currentOrFutureArticles(cityEconomy?.articles || []), profile);
  for (const article of economyArticles.slice(0, 3)) {
    const insight = ownerArticleInsight(article, profile, "Market and Competition");
    signals.push(signal({
      group: "Market and Competition",
      severity: insight.severity === "warning" ? "warning" : "opportunity",
      code: "ECO",
      name: insight.name,
      headline: insight.headline,
      metric: insight.metric,
      body: insight.body,
      source: "Local business news",
      url: article.url,
      when: article.when,
      action: insight.action,
      pointers: insight.pointers,
      evidenceTitle: insight.evidenceTitle,
      ownerReady: true
    }));
  }
}

function addNewsSignals(signals, recommendations, news, profile, feeds = {}) {
  const trendArticlePool = [
    ...(news?.articles || []),
    ...(feeds.cityEconomy?.articles || []),
    ...(feeds.localEvents?.articles || [])
  ];
  const articles = ownerRelevantArticles(currentOrFutureArticles(trendArticlePool), profile)
    .filter((article) => !isLikelyRemoteSportsArticle(article));
  if (!news?.ok && !articles.length) {
    signals.push(signal({
      group: "Media and Market",
      severity: "info",
      code: "NW",
      name: "Local news",
      headline: "No useful city trend found",
      metric: "14 days",
      body: "No current city trend looked strong enough to change staffing, inventory, pricing or promotions for this store type.",
      source: "Local news",
      url: news?.sourceUrl
    }));
    return;
  }

  const trendPlays = uniqueTrendPlays([
    ...buildCityTrendPlays(articles, profile),
    ...buildFeedTrendPlays(feeds, profile)
  ]);

  if (!trendPlays.length) {
    signals.push(signal({
      group: "Media and Market",
      severity: "info",
      code: "NW",
      name: "City trend scan",
      headline: "No profit-ready trend found",
      metric: `${articles.length} city items checked`,
      body: `Recent city stories did not clearly point to a ${labelForType(profile.businessType).toLowerCase()} sales, margin, staffing or inventory move.`,
      source: "Local news",
      url: news?.sourceUrl || feeds.cityEconomy?.sourceUrl || feeds.localEvents?.sourceUrl,
      action: "Keep the normal plan and refresh before ordering, staffing changes or a planned promotion.",
      pointers: ["Watch customer traffic", "Keep normal ordering", "Refresh before promos"],
      ownerReady: true
    }));
    return;
  }

  for (const play of trendPlays.slice(0, 5)) {
    signals.push(signal({
      group: "Media and Market",
      severity: play.severity,
      code: "TRD",
      name: play.name,
      headline: play.headline,
      metric: play.metric,
      body: play.body,
      source: play.source,
      url: play.url,
      when: play.when,
      action: play.action,
      pointers: play.pointers,
      evidenceTitle: play.evidenceTitle,
      ownerReady: true
    }));
  }

  if (trendPlays.some((play) => play.severity === "opportunity")) {
    recommendations.push(`Turn one ${profile.city || "city"} trend into a business-type-specific offer and track redemptions this week.`);
  }
}

function addRegulatorySignals(signals, banners, recommendations, regulatory, profile) {
  const checklist = licenseChecklistFor(profile);
  const dueCount = checklist.filter((item) => item.priority === "required").length;
  signals.push(signal({
    group: "Compliance and Licensing",
    severity: "info",
    code: "LIC",
    name: "License checklist",
    headline: `${checklist.length}`,
    metric: "records to keep current",
    body: `Keep these records organized for inspections and renewals: ${checklist.slice(0, 3).map((item) => item.name).join(", ")}. This is a checklist, not an urgent warning.`,
    source: "Permit checklist",
    url: checklist[0]?.url
  }));

  const rawItems = regulatory?.items || regulatory?.articles || [];
  const items = ownerRelevantArticles(rawItems.filter((item) => !item.seenAt || !isPastDatedArticle(item)), profile);
  if (!items.length) {
    signals.push(signal({
      group: "Compliance and Licensing",
      severity: "info",
      code: "LAW",
      name: "Law watch",
      headline: "No new rule found",
      metric: "localized",
      body: "No obvious new local rule showed up. Keep permit dates and certificates current in your store profile.",
      source: "Local rule check",
      url: regulatory?.sourceUrl
    }));
    return;
  }

  for (const item of items.slice(0, 4)) {
    const text = `${item.title || item.name || ""} ${item.domain || ""}`;
    const insight = ownerArticleInsight(item, profile, "Compliance and Licensing");
    const severity = /inspection|penalt|violation|minimum wage|law|ordinance|permit|license|tax/i.test(text) ? "warning" : insight.severity;
    signals.push(signal({
      group: "Compliance and Licensing",
      severity,
      code: "LAW",
      name: insight.name,
      headline: insight.headline,
      metric: insight.metric || item.status || "watch",
      body: insight.body,
      source: "Local rule check",
      url: item.url,
      when: item.when,
      action: insight.action,
      pointers: insight.pointers,
      evidenceTitle: insight.evidenceTitle,
      ownerReady: true
    }));
  }

  const firstWarning = items.find((item) => /inspection|permit|license|law|ordinance|minimum wage/i.test(`${item.title || item.name || ""}`));
  if (firstWarning) {
    banners.push({
      level: "warning",
      title: "Possible permit or rule change to review",
      body: compactHeadline(firstWarning.title || firstWarning.name || "Review the local rule source and update your checklist.")
    });
    recommendations.push("Review permits, inspection readiness and certificate expirations before the next operating change.");
  }
}

function addEventSignals(signals, recommendations, localEvents, profile) {
  const articles = ownerRelevantArticles(currentOrFutureArticles(localEvents?.articles || []), profile)
    .filter((article) => !isLikelyRemoteSportsArticle(article))
    .filter((article) => hasReliableEventTiming(article));
  if (!articles.length) {
    signals.push(signal({
      group: "Opportunities",
      severity: "info",
      code: "EV",
      name: "Event watch",
      headline: "No major event spike found",
      metric: profile.city || "local",
      body: "No obvious event-driven customer spike showed up. Keep normal staffing unless you already know of a local school, sports or neighborhood event.",
      source: "Local event news",
      url: localEvents?.sourceUrl
    }));
    return;
  }

  for (const article of articles.slice(0, 3)) {
    const insight = ownerArticleInsight(article, profile, "Opportunities");
    const text = `${article.title || ""} ${article.domain || ""}`;
    const severity = /super bowl|festival|concert|convention|game|parade|market/i.test(text) ? "opportunity" : insight.severity;
    signals.push(signal({
      group: "Opportunities",
      severity,
      code: "EV",
      name: insight.name,
      headline: insight.headline,
      metric: insight.metric,
      body: insight.body,
      source: "Local event news",
      url: article.url,
      when: article.when,
      action: insight.action,
      pointers: insight.pointers,
      evidenceTitle: insight.evidenceTitle,
      ownerReady: true
    }));
  }

  if (articles.some((article) => /super bowl|festival|concert|convention|game|parade|market/i.test(article.title || ""))) {
    recommendations.push("Plan event-mode operations: extra inventory, worker availability, prep capacity, safety checks and competitor pricing.");
  }
}

function addHazardSignals(signals, earthquakes, eonet) {
  const quakes = earthquakes?.items || [];
  if (quakes.length) {
    const top = quakes[0];
    signals.push(signal({
      group: "Regional Hazards",
      severity: top.magnitude >= 4 ? "warning" : "info",
      code: "EQ",
      name: "Earthquake",
      headline: `M${Number(top.magnitude).toFixed(1)}`,
      metric: `${Math.round(top.distanceMeters / 1000)} km`,
      body: `${top.place || "Regional earthquake"} was reported within the last week. If it was close or strong enough to matter, check shelving, glass, equipment and insurance notes.`,
      source: "USGS",
      url: top.url
    }));
  }

  const events = eonet?.events || [];
  if (events.length) {
    const first = events[0];
    const hazardText = `${first.categories || ""} ${first.title || ""}`;
    const fireLike = /wildfire|fire|smoke/i.test(hazardText);
    const stormLike = /storm|flood|severe weather/i.test(hazardText);
    signals.push(signal({
      group: "Regional Hazards",
      severity: /wildfire|fire|storm|flood/i.test(hazardText) ? "warning" : "info",
      code: "NE",
      name: fireLike ? "Fire and smoke watch" : stormLike ? "Storm watch" : "Natural event watch",
      headline: fireLike ? "Regional fire or smoke event to watch" : stormLike ? "Regional storm event to watch" : "Regional natural event to watch",
      metric: first.categories || "EONET",
      body: "A regional natural event may affect air quality, supply routing or customer traffic if it moves toward the city. Watch the forecast before changing operations.",
      source: "NASA EONET",
      url: first.link,
      action: fireLike
        ? "Check air quality, outdoor setup, staff exposure and delivery route reliability before the next busy period."
        : "Check weather, delivery route reliability, outdoor setup and customer messaging before changing the plan.",
      pointers: fireLike
        ? ["Check AQI", "Limit outdoor setup", "Check supply routes", "Message customers"]
        : ["Check forecast", "Check routes", "Protect outdoor setup", "Save owner note"],
      evidenceTitle: compactHeadline(first.title),
      ownerReady: true
    }));
  }
}

function dedupeSignalsByHeadline(signals) {
  const seenByGroup = new Map();
  const out = [];
  for (const s of signals || []) {
    const key = `${s.group || ""}|${normalizeHeadlineKey(s.headline)}`;
    if (!s.headline) {
      out.push(s);
      continue;
    }
    if (!seenByGroup.has(key)) {
      seenByGroup.set(key, true);
      out.push(s);
    }
  }
  return out;
}

function normalizeHeadlineKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function groupSignals(signals) {
  const order = [
    "Opportunities",
    "Compliance and Licensing",
    "Weather and Climate",
    "Crime and Safety",
    "Infrastructure",
    "Market and Competition",
    "Media and Market",
    "Regional Hazards",
    "System"
  ];
  const grouped = new Map();
  for (const item of signals) {
    if (!grouped.has(item.group)) grouped.set(item.group, []);
    grouped.get(item.group).push(item);
  }
  return order
    .filter((label) => grouped.has(label))
    .map((label) => ({ label, count: grouped.get(label).length, signals: grouped.get(label) }));
}

function signal({ group, severity, code, name, headline, metric, body, source, url, when, action, pointers, evidenceTitle, ownerReady }) {
  return {
    id: `${group}-${code}-${headline}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    group,
    severity,
    code,
    name,
    headline,
    metric,
    body,
    source,
    url,
    when,
    action,
    pointers,
    evidenceTitle,
    ownerReady
  };
}

function seedSignal(group, severity, name, headline, body, source) {
  return signal({ group: "System", severity, code: "SYS", name, headline, metric: "offline", body, source, url: null });
}

function buildOpportunities(profile, feeds, signals, maxItems = 14) {
  const type = profile.businessType;
  const opportunities = [];
  const eventArticle = ownerRelevantArticles(currentOrFutureArticles(feeds.localEvents?.articles || []), profile)
    .filter((article) => !isLikelyRemoteSportsArticle(article))
    .filter((article) => hasReliableEventTiming(article))
    .find((article) => /super bowl|festival|concert|convention|game|parade|market|campus|commencement|graduation|move-in|parents weekend/i.test(article.title || ""));
  const newsTrendOpportunity = buildCityTrendPlays(
    ownerRelevantArticles(currentOrFutureArticles(feeds.news?.articles || []), profile).filter((article) => !isLikelyRemoteSportsArticle(article)),
    profile
  ).find((play) => play.severity === "opportunity");
  const economyArticle = ownerRelevantArticles(currentOrFutureArticles(feeds.cityEconomy?.articles || []), profile).find((article) => ownerArticleInsight(article, profile, "Market and Competition").severity === "opportunity");
  const marketSummary = feeds.marketScan?.summary;
  const currentWeather = feeds.weather?.current || {};
  const daily = feeds.weather?.daily || {};
  const maxRain = max(daily.precipitation_probability_max);
  const maxTemp = max(daily.temperature_2m_max);

  if (eventArticle) {
    const eventInsight = ownerArticleInsight(eventArticle, profile, "Opportunities");
    opportunities.push({
      id: "event-capacity",
      type: "Event demand",
      title: eventInsight.headline || (type === "restaurant" ? "Prepare extra grab-and-go items" : "Prepare for extra walk-in traffic"),
      action: type === "restaurant"
        ? "If the event is close to your store, prep more top sellers, add a quick combo, and confirm one extra worker for the busy window."
        : "If the event is close to your store, stock best sellers, extend coverage for the peak window, and put one simple offer near checkout.",
      why: eventInsight.body,
      when: eventArticle.when,
      impact: "Potential traffic lift",
      checklist: [
        "Estimate extra foot traffic by time window",
        "Check worker availability",
        "Increase top-item inventory and prep capacity",
        "Review safety and crowd-flow checks",
        "Compare competitor pricing and offer a targeted promo"
      ],
      source: eventArticle.domain || "Local event watch",
      url: eventArticle.url
    });
  }

  if (marketSummary?.competitorCount !== undefined) {
    const competitorNames = (marketSummary.sampleCompetitors || []).map((item) => item.name).filter(Boolean).slice(0, 4);
    if (competitorNames.length >= 2 || marketSummary.competitorCount >= 5) {
      opportunities.push({
        id: "market-positioning",
        type: "Market positioning",
        title: "Check nearby competitors before choosing this week's offer",
        action: "Compare their hours, photos, menu/service clarity and prices. Choose one thing you can make clearer or better this week.",
        why: `Customers may compare you with nearby places such as ${competitorNames.join(", ") || `${marketSummary.competitorCount} similar businesses`}.`,
        impact: "Better discovery and conversion",
        checklist: ["Verify your hours", "Update photos/menu", "Compare one offer", "Improve one listing"],
        source: "City map",
        url: feeds.marketScan?.sourceUrl
      });
    } else {
      opportunities.push({
        id: "listing-visibility",
        type: "Customer discovery",
        title: "Make the store easier to find online",
        action: "Verify your business listing, hours, photos and menu/service details so customers can choose you quickly.",
        why: "The city map did not show many clearly similar businesses near this profile, so visibility and accuracy may matter more than discounting.",
        impact: "More confident customer discovery",
        checklist: ["Verify listing", "Add current hours", "Add photos", "Add menu/services"],
        source: "City map",
        url: feeds.marketScan?.sourceUrl
      });
    }
  }

  const marketIntel = feeds.marketScan?.intelligence || null;
  if (marketIntel?.busyHeatmap?.peakDay) {
    const peak = `${marketIntel.busyHeatmap.peakDay} ${formatHour12(Number(marketIntel.busyHeatmap.peakHour) || 0)}`;
    opportunities.push({
      id: "apify-peak-window-offer",
      type: "Demand timing",
      title: `Use the ${peak} peak window`,
      action: type === "restaurant"
        ? "Prep the top seller, put one quick combo near checkout, and confirm staff coverage before the rush."
        : "Move best sellers to the front, staff the rush window, and make one offer easy to understand.",
      why: `Apify found nearby places are about ${Math.round(marketIntel.busyHeatmap.peakValue || 0)}% busy at ${peak}.`,
      when: peak,
      impact: "Higher conversion during the busiest window",
      checklist: ["Prep top sellers", "Confirm staff", "Stage pickup", "Track redemptions"],
      source: "Apify",
      url: feeds.marketScan?.sourceUrl
    });
  }

  if (marketIntel?.topReviewTags?.length) {
    const topThemes = marketIntel.topReviewTags.slice(0, 3).map((tag) => tag.title).filter(Boolean);
    if (topThemes.length) {
      opportunities.push({
        id: "apify-review-theme-offer",
        type: "Customer demand",
        title: `Use review themes customers already mention`,
        action: `Make ${topThemes[0]} visible in signage, menu copy, photos, or the weekly offer.`,
        why: `Apify review analysis shows nearby customers repeatedly mention ${topThemes.join(", ")}.`,
        impact: "Better message-market fit",
        checklist: ["Pick one theme", "Update sign/menu", "Add photo", "Track sales"],
        source: "Apify",
        url: feeds.marketScan?.sourceUrl
      });
    }
  }

  if (economyArticle) {
    const economyInsight = ownerArticleInsight(economyArticle, profile, "Market and Competition");
    opportunities.push({
      id: "city-demand-driver",
      type: "City demand",
      title: economyInsight.headline,
      action: economyInsight.action,
      why: economyInsight.body,
      when: economyArticle.when,
      impact: "Better ordering and staffing",
      checklist: economyInsight.pointers,
      source: economyArticle.domain || "City economy scan",
      url: economyArticle.url
    });
  }

  if (newsTrendOpportunity) {
    opportunities.push({
      id: "local-media-promo",
      type: "City trend",
      title: newsTrendOpportunity.headline,
      action: newsTrendOpportunity.action,
      why: newsTrendOpportunity.body,
      when: newsTrendOpportunity.when,
      impact: "Profit play from city trend",
      checklist: newsTrendOpportunity.pointers,
      source: newsTrendOpportunity.source,
      url: newsTrendOpportunity.url
    });
  }

  if (Number(currentWeather.temperature_2m) >= 80 || maxTemp >= 85) {
    const when = forecastPeakLabel(daily, daily.temperature_2m_max, "heat");
    opportunities.push({
      id: "hot-weather-products",
      type: "Weather",
      title: "Stock for hot-weather purchases",
      action: type === "restaurant" ? "Stock cold drinks, quick lunch items and extra ice; pre-chill before afternoon traffic." : "Place warm-weather essentials near checkout and check cooling needs.",
      why: `The forecast shows a high near ${numberOrDash(maxTemp)} F this week.`,
      when,
      impact: "Higher basket size on hot days",
      checklist: ["Check cold storage", "Place impulse items", "Prep staff talking points", "Review HVAC load"],
      source: "Open-Meteo",
      url: feeds.weather?.sourceUrl
    });
  }

  if (maxRain >= 55) {
    const when = forecastPeakLabel(daily, daily.precipitation_probability_max, "rain");
    opportunities.push({
      id: "rain-delivery",
      type: "Weather",
      title: "Protect sales during rain",
      action: "Promote pickup/delivery before rain hits, confirm packaging stock, and keep labor flexible if walk-in traffic slows.",
      why: `Rain chance reaches ${Math.round(maxRain)}% this week.`,
      when,
      impact: "Protect walk-in revenue",
      checklist: ["Enable delivery promo", "Confirm packaging stock", "Tune staffing", "Post weather-aware message"],
      source: "Open-Meteo",
      url: feeds.weather?.sourceUrl
    });
  }

  if (Number.isFinite(maxRain) && maxRain <= 35 && Number.isFinite(maxTemp) && maxTemp >= 58 && maxTemp <= 84) {
    opportunities.push({
      id: "favorable-weather-traffic",
      type: "Weather",
      title: "Use favorable weather for walk-in traffic",
      action: type === "restaurant"
        ? "Put one high-margin item on signage/social, keep patio or front-window messaging clear, and staff the lunch or dinner window that usually converts."
        : "Use the good-weather window for signage, pickup convenience and one visible offer that passersby can understand quickly.",
      why: `The weekly forecast looks usable for walk-in demand: high near ${numberOrDash(maxTemp)} F with rain chance staying near ${numberOrDash(maxRain)}%.`,
      when: "Next 7 days",
      impact: "Potential walk-in lift",
      checklist: ["Pick weather window", "Feature one offer", "Update signage", "Track visits"],
      source: "Open-Meteo",
      url: feeds.weather?.sourceUrl
    });
  }

  for (const item of opportunityItemsFromSignals(profile, signals)) opportunities.push(item);
  for (const item of closureOpportunityItems(profile, feeds)) opportunities.push(item);

  const complianceWarning = signals.find((s) => s.group === "Compliance and Licensing" && s.severity === "warning" && s.code !== "LIC");
  if (complianceWarning) {
    opportunities.push({
      id: "inspection-readiness",
      type: "Compliance",
      title: "Prepare permit and inspection records",
      action: "Check whether the rule or permit item applies, then update permit dates, certificates and store notes.",
      why: "A local rule or permit item may affect this store.",
      impact: "Avoid fines, closures and delayed permits",
      checklist: ["Check applicability", "Update permit dates", "Check certificates", "Save notes"],
      source: complianceWarning.source,
      url: complianceWarning.url
    });
  }

  if (!opportunities.length) {
    opportunities.push({
      id: "baseline-growth",
      type: "Operations",
      title: "This week looks steady",
      action: "Keep the normal plan, then do one weekly check before ordering: forecast, staffing, permits, inventory and nearby competitors.",
      why: "No urgent weather, safety, event or local demand change stood out enough to require a major adjustment.",
      impact: "Avoid overreacting",
      checklist: ["Check forecast", "Confirm staffing", "Review permits", "Place normal order"],
      source: "Righthand AI",
      url: null
    });
  }

  return uniqueOwnerItems(opportunities).slice(0, maxItems).map((item) => ({
    ...item,
    url: readableEvidenceUrl(profile, item.url)
  }));
}

function opportunityItemsFromSignals(profile, signals) {
  return (signals || [])
    .filter((item) => item.severity === "opportunity")
    .filter((item) => item.code !== "MKT")
    .map((item) => ({
      id: `signal-opportunity-${item.id}`,
      type: item.group || "Opportunity",
      title: opportunityTitle(item, profile),
      action: item.action || opportunityAction(item, profile),
      why: item.body || "A city signal may affect customer traffic, staffing, inventory, pricing or promotion.",
      when: item.when,
      impact: opportunityImpact(item),
      checklist: item.pointers?.length ? item.pointers : opportunityPointers(item),
      source: item.source,
      url: item.url
    }));
}

function opportunityTitle(item, profile) {
  const text = `${item.group || ""} ${item.name || ""} ${item.headline || ""} ${item.body || ""}`.toLowerCase();
  const type = labelForType(profile.businessType).toLowerCase();
  if (/aqi|air quality|clean air/.test(text)) return "Clean air window: keep outdoor and walk-up plan active";
  if (/weather|rain|heat|forecast/.test(text)) return `Weather window: tune ${type} staffing and offer`;
  if (/event|festival|concert|campus|game|parade|market/.test(text)) return "Event traffic: prepare inventory, staffing and offer";
  if (/media|trend|dining|shopping|growth/.test(text)) return "City trend: turn local attention into one profit play";
  if (/permit|license|compliance|inspection|rule/.test(text)) return "Compliance work: turn risk prevention into readiness";
  return item.headline || item.name || "Opportunity to review";
}

function opportunityImpact(item) {
  const text = `${item.group || ""} ${item.name || ""} ${item.headline || ""} ${item.body || ""}`.toLowerCase();
  if (/aqi|air quality|weather|rain|heat/.test(text)) return "Weather-driven demand planning";
  if (/event|festival|concert|campus|game|parade|market/.test(text)) return "Potential short-window traffic lift";
  if (/media|trend|market|competition|economy/.test(text)) return "Sales, pricing or visibility decision";
  if (/permit|license|compliance|inspection|rule/.test(text)) return "Avoid fines and prevent disruption";
  return item.metric || "Owner decision";
}

function closureOpportunityItems(profile, feeds) {
  const pool = [
    ...(feeds.cityEconomy?.articles || []),
    ...(feeds.news?.articles || []),
    ...(feeds.regulatory?.articles || []),
    ...(feeds.regulatory?.items || [])
  ];
  return ownerRelevantArticles(currentOrFutureArticles(pool), profile)
    .filter((article) => /(ordered closed|temporary closure|permanently closed|closing|closure|shutting down|shut down|bankrupt|out of business)/i.test(`${article.title || article.name || ""} ${article.description || ""}`))
    .slice(0, 3)
    .map((article, index) => ({
      id: `closure-opportunity-${index}-${slugify(article.title || article.name || "closure")}`,
      type: "Market disruption",
      title: "Closure or shutdown nearby: check demand shift",
      action: "If the place is near your customers, update hours/listing, promote a trust-building offer, and stock the items customers may look for elsewhere.",
      why: "A closure, shutdown or bankruptcy can move customer demand, competitor traffic or trust expectations. Treat it as useful only if the area or audience overlaps your store.",
      when: article.when,
      impact: "Possible displaced demand",
      checklist: ["Check distance", "Check customer overlap", "Audit trust signals", "Promote one replacement offer"],
      source: article.domain || article.source || "Local market scan",
      url: article.url
    }));
}

function opportunityAction(item, profile) {
  const text = `${item.group || ""} ${item.name || ""} ${item.headline || ""} ${item.body || ""}`.toLowerCase();
  const type = normalizeType(profile.businessType);
  if (/weather|rain|heat|aqi|air/.test(text)) return type === "restaurant"
    ? "Match the menu, prep and staffing to the forecast window; push pickup/delivery if walk-ins may slow."
    : "Use the forecast to adjust staffing, signage, inventory placement and pickup messaging.";
  if (/event|festival|concert|campus|game|parade|market/.test(text)) return "Confirm timing and distance, then add inventory, staff coverage and one short-window offer.";
  if (/market|competition|economy|media|trend/.test(text)) return "Convert the signal into one measurable decision: offer, pricing, hours, staffing, listing, signage or stock.";
  if (/permit|license|compliance|inspection|rule/.test(text)) return "Use the signal to reduce risk: update records, due dates and inspection readiness before it becomes urgent.";
  return "Pick one owner action for this week and track whether it changes sales, traffic, margin or risk.";
}

function opportunityPointers(item) {
  const text = `${item.group || ""} ${item.name || ""} ${item.headline || ""} ${item.body || ""}`.toLowerCase();
  if (/weather|rain|heat|aqi|air/.test(text)) return ["Pick forecast window", "Tune staffing", "Adjust offer", "Watch waste"];
  if (/event|festival|concert|campus|game|parade|market/.test(text)) return ["Check timing", "Check distance", "Stock top sellers", "Track redemptions"];
  if (/market|competition|economy|media|trend/.test(text)) return ["Check audience", "Choose one offer", "Update listing/signage", "Track result"];
  if (/permit|license|compliance|inspection|rule/.test(text)) return ["Check applicability", "Update records", "Assign owner", "Save note"];
  return ["Check fit", "Choose action", "Assign owner", "Track result"];
}

function uniqueOwnerItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const titleKey = `${item.title || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const key = titleKey || (item.url ? String(item.url).toLowerCase() : `${item.id || ""}|${item.action || ""}`.toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildWarnings(profile, feeds, warningSignals, maxItems = 14) {
  const warnings = warningSignals.map((item, index) => ({
    id: `warning-${index}-${item.id}`,
    type: item.group,
    title: warningTitle(item),
    urgency: item.severity === "critical" ? "High" : "Medium",
    why: item.body,
    when: item.when,
    action: warningAction(item, profile),
    pointers: warningPointers(item, profile),
    source: item.source,
    url: readableEvidenceUrl(profile, item.url)
  }));

  const marketIntel = feeds.marketScan?.intelligence || null;
  const topRated = marketIntel?.topRated?.[0];
  if (topRated && Number(topRated.rating) >= 4.6 && Number(topRated.reviews) >= 200) {
    warnings.push({
      id: "apify-top-competitor-benchmark",
      type: "Market and Competition",
      title: "Top nearby competitor sets a high bar",
      urgency: "Medium",
      why: `${topRated.name} is visible nearby with ${Number(topRated.rating).toFixed(1)} stars and ${formatCompactNumber(topRated.reviews)} reviews. Customers may compare photos, hours, speed, and price before choosing.`,
      when: "This week",
      action: "Compare your listing, photos, top offer, and hours against that benchmark; fix one gap today.",
      pointers: ["Open competitor", "Check photos", "Check hours", "Fix one gap"],
      source: "Apify",
      url: feeds.marketScan?.sourceUrl
    });
  }

  const negativeFlag = marketIntel?.negativeFlags?.[0];
  if (negativeFlag) {
    warnings.push({
      id: "apify-review-risk-theme",
      type: "Market and Competition",
      title: `Review risk theme: ${negativeFlag.title}`,
      urgency: "Medium",
      why: `Apify review analysis found ${negativeFlag.title} appearing around nearby businesses. Prevent the same issue before customers mention it about you.`,
      when: "Before next rush",
      action: "Brief staff on this issue and add one quick check before the peak window.",
      pointers: ["Brief staff", "Add checklist item", "Watch reviews"],
      source: "Apify",
      url: feeds.marketScan?.sourceUrl
    });
  }

  if (!warnings.length) {
    warnings.push({
      id: "no-critical-warning",
      type: "Monitoring",
      title: "No urgent issue found right now",
      urgency: "Low",
      why: `Recent checks for ${profile.city || profile.locationLabel} did not show a weather, safety, access or permit issue that needs immediate action.`,
      when: "Now",
      action: "Use the weekly forecast and opportunity cards for planning; refresh before major orders or staffing changes.",
      pointers: ["Review weather before ordering perishables", "Check license checklist monthly", "Confirm store records are complete"],
      source: "Righthand AI synthesis",
      url: null
    });
  }

  return uniqueOwnerItems(warnings).slice(0, maxItems);
}

function buildMetrics(profile, feeds, signals, opportunities, warnings) {
  const market = feeds.marketScan?.intelligence || {};
  const places = feeds.marketScan?.items || [];
  const topRated = market.topRated?.[0] || places
    .filter((place) => Number(place.rating) > 0)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0];
  const competitorCount = Number(market.competitorsAnalyzed || feeds.marketScan?.summary?.competitorCount || places.length || 0);
  const totalReviews = places.reduce((sum, place) => sum + (Number(place.reviews) || 0), 0);
  const peak = market.busyHeatmap?.peakDay
    ? `${market.busyHeatmap.peakDay} ${formatHour12(Number(market.busyHeatmap.peakHour) || 0)}`
    : "Next 7 days";
  const docs = licenseChecklistFor(profile);
  const requiredDocs = docs.filter((item) => item.priority === "required").length;
  const firstOpportunity = opportunities.find((item) => item.id !== "baseline-growth") || opportunities[0];
  const actionableWarnings = warnings.filter((item) => item.urgency !== "Low");
  const base = [
    {
      label: "Nearby competitors",
      value: String(competitorCount || "--"),
      detail: topRated?.name ? `Benchmark: ${topRated.name}` : "Apify scan in progress",
      tone: competitorCount ? "info" : "warn"
    },
    {
      label: "Block rating",
      value: market.avgRating ? `${Number(market.avgRating).toFixed(1)}★` : "--",
      detail: totalReviews ? `${formatCompactNumber(totalReviews)} public reviews tracked` : "Waiting for review signal",
      tone: market.avgRating >= 4.4 ? "good" : "info"
    },
    {
      label: "Peak sales window",
      value: peak,
      detail: market.busyHeatmap?.peakValue ? `~${Math.round(market.busyHeatmap.peakValue)}% busy nearby` : "Use forecast and orders",
      tone: "good"
    },
    {
      label: "Best play",
      value: firstOpportunity?.type || "Growth",
      detail: firstOpportunity?.title || "Refresh for owner play",
      tone: "good"
    },
    {
      label: "Owner alerts",
      value: String(actionableWarnings.length),
      detail: actionableWarnings[0]?.title || "No urgent issue right now",
      tone: actionableWarnings.some((item) => item.urgency === "High") ? "risk" : "warn"
    },
    {
      label: "Required docs",
      value: String(requiredDocs),
      detail: `${docs.length} records in checklist`,
      tone: "info"
    }
  ];
  return [...base, ...industrySpecificMetrics(profile, feeds)];
}

function formatCompactNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n));
}

function industrySpecificMetrics(profile, feeds) {
  const type = normalizeType(profile?.businessType);
  const mi = feeds?.marketScan?.intelligence;
  if (!mi) return [];
  const out = [];

  if (mi.dominantTierLabel) {
    const dominantPct = mi.priceDistribution?.find((p) => p.tier === mi.dominantTier)?.pct || 0;
    out.push({
      label: pricingLabelForType(type),
      value: mi.dominantTierLabel,
      detail: `${dominantPct}% of nearby`,
      tone: "info"
    });
  }

  if (mi.avgRating) {
    out.push({
      label: "Block avg rating",
      value: `${mi.avgRating.toFixed(1)}★`,
      detail: `${mi.competitorsAnalyzed} competitors`,
      tone: mi.avgRating >= 4.6 ? "warn" : "good"
    });
  }

  const peak = mi.busyHeatmap;
  if (peak?.peakDay && peak.peakValue >= 50) {
    out.push({
      label: peakDemandLabelForType(type),
      value: `${peak.peakDay} ${formatHour12(peak.peakHour)}`,
      detail: `~${peak.peakValue}% busy block-wide`,
      tone: "info"
    });
  }

  const cb = mi.categoryBreakdown;
  if (cb?.entries?.length && ["restaurant", "coffee shop", "food stall", "grocery", "retail", "salon", "auto repair", "liquor store"].includes(type)) {
    const top = cb.entries[0];
    out.push({
      label: dominantLabelForType(type),
      value: shortLabel(top.label, 22),
      detail: `${top.pct}% of nearby (${top.count})`,
      tone: "info"
    });
  }

  if (type === "laundromat" || type === "pharmacy" || type === "liquor store") {
    const hc = mi.hoursCoverage;
    if (hc?.contributing) {
      const pct = Math.round((hc.openLateCount / hc.contributing) * 100);
      out.push({
        label: "Late-hour competitors",
        value: `${hc.openLateCount}/${hc.contributing}`,
        detail: `${pct}% open past 9pm`,
        tone: pct > 50 ? "warn" : "info"
      });
    }
    if (type === "laundromat" && hc?.open24Count) {
      out.push({
        label: "24-hour rivals",
        value: String(hc.open24Count),
        detail: `of ${hc.contributing} parsed schedules`,
        tone: hc.open24Count > 0 ? "warn" : "good"
      });
    }
  }

  if (type === "salon" || type === "barbershop") {
    if (mi.topReviewTags?.length) {
      const topService = mi.topReviewTags.find((t) => t.places >= 3 && t.title.split(/\s+/).length >= 2);
      if (topService) {
        out.push({
          label: "Most-asked service nearby",
          value: shortLabel(topService.title, 22),
          detail: `mentioned at ${topService.places} places`,
          tone: "info"
        });
      }
    }
  }

  if (type === "restaurant" || type === "coffee shop" || type === "food stall") {
    if (mi.topReviewTags?.length) {
      const dish = mi.topReviewTags.find((t) => t.places >= 3 && t.title.split(/\s+/).length >= 2 && !/seating|view|outdoor|bar|service|atmosphere/i.test(t.title));
      if (dish) {
        out.push({
          label: "Top dish/item theme",
          value: shortLabel(dish.title, 22),
          detail: `at ${dish.places} nearby places`,
          tone: "info"
        });
      }
    }
  }

  if (type === "daycare") {
    out.push({
      label: "Family-zone signals",
      value: String(mi.competitorsAnalyzed || 0),
      detail: "nearby childcare options",
      tone: "info"
    });
  }

  return out.slice(0, 4);
}

function pricingLabelForType(type) {
  const labels = {
    restaurant: "Block price tier",
    "coffee shop": "Block price tier",
    "food stall": "Block price tier",
    grocery: "Basket price tier",
    retail: "Basket price tier",
    salon: "Service price tier",
    barbershop: "Cut price tier",
    laundromat: "Service price tier",
    "auto repair": "Ticket size tier",
    pharmacy: "Basket price tier",
    "liquor store": "Bottle price tier",
    daycare: "Tuition tier"
  };
  return labels[type] || "Block price tier";
}

function peakDemandLabelForType(type) {
  const labels = {
    restaurant: "Peak meal window",
    "coffee shop": "Peak coffee window",
    "food stall": "Peak rush window",
    salon: "Peak booking window",
    barbershop: "Peak booking window",
    laundromat: "Peak laundry window",
    pharmacy: "Peak counter window",
    daycare: "Peak family window",
    "auto repair": "Peak service window",
    "liquor store": "Peak buying window",
    grocery: "Peak basket window",
    retail: "Peak walk-in window"
  };
  return labels[type] || "Peak demand window";
}

function dominantLabelForType(type) {
  const labels = {
    restaurant: "Dominant cuisine nearby",
    "coffee shop": "Dominant café type",
    "food stall": "Dominant food type",
    grocery: "Dominant grocery format",
    retail: "Dominant retail category",
    salon: "Dominant salon type",
    barbershop: "Dominant barber style",
    "auto repair": "Dominant service type",
    "liquor store": "Dominant beverage focus"
  };
  return labels[type] || "Dominant category";
}

function shortLabel(value, max = 22) {
  const clean = String(value || "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function buildWeatherForecast(weather) {
  const daily = weather?.daily || {};
  const times = daily.time || [];
  return times.map((date, index) => ({
    date,
    day: weekdayLabel(date),
    condition: weatherCodeLabel(daily.weather_code?.[index]),
    highF: numberOrNull(daily.temperature_2m_max?.[index]),
    lowF: numberOrNull(daily.temperature_2m_min?.[index]),
    rainProbability: numberOrNull(daily.precipitation_probability_max?.[index]),
    windMph: numberOrNull(daily.wind_speed_10m_max?.[index]),
    source: "Open-Meteo",
    url: weather?.sourceUrl || null
  })).slice(0, 7);
}

function buildCitations(profile, feeds, synthesis) {
  const citations = [
    { name: "City boundary and geocoding", source: profile.cityScopeSource || profile.geocoder || "Nominatim", url: profile.cityScopeUrl || profile.sourceUrl || "https://nominatim.openstreetmap.org/" }
  ];

  for (const [key, feed] of Object.entries(feeds)) {
    if (!feed?.sourceUrl) continue;
    citations.push({
      name: sourceLabel(key),
      source: feed.message || (feed.ok ? "Public data feed" : "Feed check"),
      url: feed.sourceUrl
    });
  }

  for (const item of [...(synthesis.opportunities || []), ...(synthesis.warnings || [])]) {
    if (!item?.url) continue;
    citations.push({ name: item.source || item.type || "Signal source", source: item.title, url: item.url });
  }

  const seen = new Set();
  return citations.filter((item) => {
    const key = `${item.name}-${item.url}`;
    if (!item.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 18);
}

function sourceLabel(key) {
  const labels = {
    weather: "Weather",
    air: "Air quality",
    alerts: "Weather alerts",
    police: "Safety incidents",
    cases311: "City service cases",
    marketScan: "Apify market scan",
    citySafety: "City safety scan",
    cityInfrastructure: "City infrastructure scan",
    cityEconomy: "City economy scan",
    news: "Local media scan",
    regulatory: "Regulatory scan",
    localEvents: "Local event scan",
    earthquakes: "USGS earthquakes",
    eonet: "NASA EONET"
  };
  return labels[key] || key;
}

function warningTitle(item) {
  if (item.ownerReady && item.headline) return item.headline;
  const text = `${item.group} ${item.name} ${item.headline}`.toLowerCase();
  if (/weather|rain|storm|wind|heat|aqi|air/.test(text)) return `Weather needs review: ${item.headline || item.name}`;
  if (/crime|safety|police|theft|robbery|fire/.test(text)) return `Safety item to review: ${item.headline || item.name}`;
  if (/infrastructure|311|road|construction|outage|utility|water|transit/.test(text)) return `Access or utility item: ${item.headline || item.name}`;
  if (/license|permit|inspection|law|regulatory|minimum wage/.test(text)) return `Permit or rule item: ${item.headline || item.name}`;
  if (/market|competition|economy|media/.test(text)) return "Market item: decide if it affects customers";
  return item.severity === "critical" ? "Urgent owner action needed" : "Owner action to review";
}

function warningAction(item, profile) {
  if (item.action) return item.action;
  const text = `${item.group} ${item.name} ${item.headline} ${item.body}`.toLowerCase();
  if (/weather|rain|storm|wind|heat|aqi|air/.test(text)) return "Adjust staffing, delivery messaging, outdoor seating/signage and perishable ordering before the affected forecast window.";
  if (/crime|safety|police|theft|robbery|fire/.test(text)) return "Review closing procedures, exterior lighting, camera coverage, cash handling and staff walkout timing.";
  if (/infrastructure|311|road|construction|outage|utility|water|transit/.test(text)) return "Check delivery routes, curb access, utility continuity and customer access before peak hours.";
  if (/license|permit|inspection|law|regulatory|minimum wage/.test(text)) return "Open the cited source, update your license/document checklist, and assign an owner plus due date.";
  if (/market|competition|economy/.test(text)) return "Compare competitor hours/offers and turn the signal into one pricing, promo or staffing decision.";
  return `Review the cited ${profile.city || "city"} source and decide whether this changes staffing, inventory, safety, pricing or compliance this week.`;
}

function warningPointers(item) {
  if (Array.isArray(item.pointers) && item.pointers.length) return item.pointers;
  const text = `${item.group} ${item.name} ${item.headline} ${item.body}`.toLowerCase();
  if (/weather|rain|storm|wind|heat|aqi|air/.test(text)) return ["Check 7-day forecast card", "Protect perishables and outdoor setup", "Prepare delivery/pickup messaging"];
  if (/crime|safety|police|theft|robbery|fire/.test(text)) return ["Verify lighting and cameras", "Reduce closing cash exposure", "Set staff walkout procedure"];
  if (/infrastructure|311|road|construction|outage|utility|water|transit/.test(text)) return ["Confirm access routes", "Warn delivery partners", "Plan backup utility or supplies"];
  if (/license|permit|inspection|law|regulatory|minimum wage/.test(text)) return ["Open cited agency page", "Update renewal dates", "Store certificate/document notes"];
  if (/market|competition|economy|media/.test(text)) return ["Check affected area", "Check customer fit", "Pick one decision"];
  return ["Check location", "Check timing", "Save owner note"];
}

function weekdayLabel(value) {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value || "";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function weatherCodeLabel(code) {
  const value = Number(code);
  if ([0].includes(value)) return "Clear";
  if ([1, 2].includes(value)) return "Partly cloudy";
  if ([3].includes(value)) return "Overcast";
  if ([45, 48].includes(value)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(value)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "Snow";
  if ([95, 96, 99].includes(value)) return "Thunderstorm";
  return "Forecast";
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function competitorCategories(type) {
  const map = {
    restaurant: ["restaurant", "cafe", "fast_food", "food"],
    grocery: ["supermarket", "convenience", "greengrocer", "grocery", "deli"],
    retail: ["clothes", "convenience", "gift", "department_store", "shop"],
    salon: ["beauty", "hairdresser"],
    barbershop: ["hairdresser", "barber"],
    laundromat: ["laundry"],
    pharmacy: ["pharmacy"],
    daycare: ["childcare", "school", "kindergarten"],
    "auto repair": ["car_repair", "car", "tyres", "vehicle_inspection"]
  };
  return map[normalizeType(type)] || ["shop", "store", "business"];
}

function osmElementUrl(element) {
  if (!element?.type || !element?.id) return "https://www.openstreetmap.org/";
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function osmMapUrl(profile, pinLat, pinLon) {
  const lat = Number(pinLat ?? profile.lat);
  const lon = Number(pinLon ?? profile.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "https://www.openstreetmap.org/";
  // Marker URL: drops a pin at lat/lon and zooms to street level so "view evidence" is
  // an actual point on the map, not just a centered tile view.
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=17/${lat.toFixed(5)}/${lon.toFixed(5)}`;
}

function readableEvidenceUrl(profile, url) {
  if (!url) return null;
  const text = String(url);
  if (text.includes("overpass-api.de/api/interpreter")) return osmMapUrl(profile);
  if (text.includes("api.open-meteo.com")) {
    const lat = Number(profile.lat);
    const lon = Number(profile.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return `https://forecast.weather.gov/MapClick.php?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
    return "https://www.weather.gov/";
  }
  if (text.includes("news.google.com/rss/search")) return text.replace("/rss/search", "/search");
  if (text.includes("api.gdeltproject.org/api/v2/doc/doc")) {
    try {
      const parsed = new URL(text);
      const q = parsed.searchParams.get("query") || `${profile.city || profile.locationLabel || ""} ${labelForType(profile.businessType)} small business`;
      return `https://news.google.com/search?${new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" })}`;
    } catch {
      return googleNewsSearchUrl(profile);
    }
  }
  return text;
}

function googleNewsSearchUrl(profile) {
  const q = `${profile.city || profile.locationLabel || ""} ${labelForType(profile.businessType)} small business`.trim();
  return `https://news.google.com/search?${new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" })}`;
}

function licenseChecklistFor(profile) {
  const type = normalizeType(profile.businessType);
  const city = String(profile.city || "").toLowerCase();
  const sf = city.includes("san francisco") || isSanFrancisco(profile);
  const sc = city.includes("santa clara");
  const items = [];

  // === Industry-specific (most important — listed first) ===
  for (const item of industryDocuments(type, profile, { sf, sc })) {
    items.push({ ...item, category: "industry" });
  }

  // === Tax & registration (universal) ===
  items.push({
    category: "registration",
    id: "business-license",
    name: "Local business license / business tax certificate",
    priority: "required",
    authority: sf ? "SF Treasurer & Tax Collector" : sc ? "City of Santa Clara Finance" : `${profile.city || "Local city"} business office`,
    renewal: "Annual",
    url: sf ? "https://www.sf.gov/register-your-business" : sc ? "https://www.santaclaraca.gov/business-development/business-services/business-tax-certificate" : "https://www.ca.gov/service/?item=register-a-business",
    why: "Required to legally operate inside city limits. Missing it triggers fines + interest."
  });
  items.push({
    category: "registration",
    id: "ein",
    name: "Federal EIN (Employer Identification Number)",
    priority: "required",
    authority: "IRS",
    renewal: "One-time",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
    why: "Required for payroll, tax filings, and most business banking. Free to obtain."
  });
  items.push({
    category: "registration",
    id: "boi-fincen",
    name: "Beneficial Ownership Information (BOI) report",
    priority: "required",
    authority: "FinCEN",
    renewal: "On formation + on ownership changes",
    url: "https://boiefiling.fincen.gov/",
    why: "Federal anti-money-laundering rule. Most LLCs and corporations must file. Penalties for missing this."
  });
  items.push({
    category: "registration",
    id: "seller-permit",
    name: "California seller's permit (sales tax)",
    priority: "required",
    authority: "CDTFA — Department of Tax and Fee Administration",
    renewal: "Active while selling taxable goods",
    url: "https://www.cdtfa.ca.gov/services/permits-licenses.htm",
    why: "Required for any retail sales of tangible goods. Free."
  });
  items.push({
    category: "registration",
    id: "fbn",
    name: "Fictitious Business Name (DBA) filing",
    priority: "conditional",
    authority: "County Clerk",
    renewal: "Every 5 years",
    url: sf ? "https://www.sf.gov/renew-change-or-refile-fictitious-business-name-fbn" : "https://www.ca.gov/service/?item=file-a-fictitious-business-name",
    why: "Required if you operate under a name different from your legal entity name."
  });
  items.push({
    category: "registration",
    id: "soi",
    name: "Statement of Information (LLC/Corp)",
    priority: "conditional",
    authority: "California Secretary of State",
    renewal: "LLC: every 2 years · Corp: annual",
    url: "https://bizfileonline.sos.ca.gov/",
    why: "Required filing for registered entities. Late filing triggers $250 penalty + suspension."
  });

  // === Insurance & coverage ===
  items.push({
    category: "insurance",
    id: "workers-comp",
    name: "Workers' compensation insurance",
    priority: "required",
    authority: "California DIR",
    renewal: "Policy term",
    url: "https://www.dir.ca.gov/dwc/employer.htm",
    why: "Mandatory if you have any employees. Misdemeanor + $10,000+ penalty if missing."
  });
  items.push({
    category: "insurance",
    id: "general-liability",
    name: "General liability insurance",
    priority: "recommended",
    authority: "Private carrier",
    renewal: "Policy term",
    url: "https://www.sba.gov/business-guide/launch-your-business/get-business-insurance",
    why: "Covers slip-and-fall, customer injury, property damage. Most leases require it."
  });
  items.push({
    category: "insurance",
    id: "property-insurance",
    name: "Property / contents insurance",
    priority: "recommended",
    authority: "Private carrier",
    renewal: "Policy term",
    url: "https://www.sba.gov/business-guide/launch-your-business/get-business-insurance",
    why: "Covers fire, theft, water damage to inventory and equipment."
  });

  // === Employer & HR (if employees) ===
  items.push({
    category: "employer",
    id: "edd",
    name: "California EDD employer registration",
    priority: "required",
    authority: "Employment Development Department (EDD)",
    renewal: "Active while employing staff",
    url: "https://edd.ca.gov/en/payroll_taxes/Am_I_Required_to_Register_as_an_Employer/",
    why: "Required as soon as you pay $100+/quarter in wages. Handles state payroll taxes."
  });
  items.push({
    category: "employer",
    id: "i9",
    name: "Form I-9 for every employee",
    priority: "required",
    authority: "USCIS",
    renewal: "Within 3 days of hire; keep on file",
    url: "https://www.uscis.gov/i-9",
    why: "Required to verify work authorization. ICE can audit; fines up to $2,789 per missing form."
  });
  items.push({
    category: "employer",
    id: "ca-wage-poster",
    name: "Required workplace posters (state + federal)",
    priority: "required",
    authority: "DIR + DOL",
    renewal: "Update when laws change",
    url: "https://www.dir.ca.gov/wpnodb.html",
    why: "Free posters. Fines $100-$1000 per missing poster. Posted in employee-visible area."
  });
  items.push({
    category: "employer",
    id: "minimum-wage",
    name: "Minimum wage compliance log",
    priority: "required",
    authority: "California DIR + local city",
    renewal: "Track when local wage updates (most cities adjust each year)",
    url: sf ? "https://www.sf.gov/topics/minimum-wage" : "https://www.dir.ca.gov/dlse/faq_minimumwage.htm",
    why: "Local minimum wages can exceed state. Penalties + back wages on failure."
  });

  // === Storefront & accessibility ===
  items.push({
    category: "storefront",
    id: "ada-access",
    name: "ADA accessibility audit",
    priority: "required",
    authority: "DOJ + state accessibility rules",
    renewal: "Re-check whenever layout changes",
    url: sf ? "https://www.sf.gov/improve-ada-accessibility-your-business" : "https://www.ada.gov/",
    why: "Drive-by lawsuits target small storefronts. Federal tax credit available for compliance work."
  });
  items.push({
    category: "storefront",
    id: "casp",
    name: "CASp (Certified Access Specialist) inspection",
    priority: "recommended",
    authority: "California Division of the State Architect",
    renewal: "When you sign a new lease",
    url: "https://www.dgs.ca.gov/DSA/Programs/ProgCASp",
    why: "California-specific shield against ADA suits. Limits damages and gives 120 days to fix issues."
  });
  items.push({
    category: "storefront",
    id: "signage-permit",
    name: "Signage / awning permit",
    priority: "conditional",
    authority: sf ? "SF Permit Center / Public Works" : sc ? "Santa Clara Planning Division" : "Local planning/public works",
    renewal: "When changing or adding signage",
    url: sf ? "https://www.sf.gov/topics--business" : "https://www.dgs.ca.gov/",
    why: "Most cities require permits for exterior signs > certain size or lit signs."
  });
  items.push({
    category: "storefront",
    id: "fire-extinguisher",
    name: "Fire extinguisher servicing tags",
    priority: "required",
    authority: "Local fire department + servicing vendor",
    renewal: "Annual",
    url: sf ? "https://sf-fire.org/" : "https://osfm.fire.ca.gov/",
    why: "Inspectors check tags. Out-of-date tag = fail an inspection."
  });

  // === Records to keep ongoing ===
  items.push({
    category: "records",
    id: "lease",
    name: "Signed lease + amendments",
    priority: "required",
    authority: "Internal",
    renewal: "Until end of term",
    url: "https://www.sba.gov/business-guide/grow-your-business/buy-assets-equipment",
    why: "Original lease, all addenda, security deposit receipts, CASp report (if any). Have ready for any zoning/permit issue."
  });
  items.push({
    category: "records",
    id: "tax-records",
    name: "Three years of tax returns + payroll records",
    priority: "required",
    authority: "Internal (IRS retention rules)",
    renewal: "Keep 3-7 years",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records",
    why: "IRS audit window is 3 years (6 years if substantial under-report). Payroll: 4 years."
  });
  items.push({
    category: "records",
    id: "supplier-contracts",
    name: "Supplier / vendor contracts",
    priority: "recommended",
    authority: "Internal",
    renewal: "Until contract end",
    url: "https://www.sba.gov/business-guide/grow-your-business",
    why: "Useful in disputes (delivery quality, pricing, exclusivity)."
  });
  items.push({
    category: "records",
    id: "employee-records",
    name: "Employee records: timesheets, paystubs, W-4s",
    priority: "required",
    authority: "Internal (DIR retention rules)",
    renewal: "Keep 4 years",
    url: "https://www.dir.ca.gov/dlse/faq_paydays.htm",
    why: "California requires 4 years of payroll records. Wage-claim audits are common."
  });
  items.push({
    category: "records",
    id: "inspection-history",
    name: "Inspection history (health, fire, building)",
    priority: "recommended",
    authority: "Internal",
    renewal: "Keep ongoing",
    url: "",
    why: "Helps if you get a sudden re-inspection or sell the business."
  });

  return items;
}

function industryDocuments(type, profile, ctx) {
  const { sf, sc } = ctx || {};
  const list = {
    "restaurant": [
      { id: "health-permit", name: "Retail food facility health permit", priority: "required", authority: sf ? "SF Department of Public Health" : sc ? "Santa Clara County Environmental Health" : "County environmental health", renewal: "Annual", url: sf ? "https://www.sf.gov/get-health-permit-open-restaurant-bar-or-other-retail-food-location" : sc ? "https://deh.santaclaracounty.gov/food" : "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "Required before any food prep. Fail = same-day closure." },
      { id: "food-safety-manager", name: "Certified Food Protection Manager", priority: "required", authority: "ANSI-accredited (ServSafe, etc.)", renewal: "5 years", url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "California requires one certified manager per facility. ~$125 + 8-hr course." },
      { id: "food-handler", name: "Food handler cards (per worker)", priority: "required", authority: "California Food Handler Card program", renewal: "3 years per employee", url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "$15/employee, 1.5 hrs online. Required within 30 days of hire." },
      { id: "abc-license", name: "ABC alcohol license (if serving)", priority: "conditional", authority: "California ABC", renewal: "Annual", url: "https://www.abc.ca.gov/licensing/", why: "Type 41 (beer/wine) or Type 47 (full bar). $300-$1,100 + waitlist." },
      { id: "fire-suppression", name: "Type I hood + fire suppression inspection", priority: "required", authority: "Local fire department", renewal: "Semi-annual", url: sf ? "https://sf-fire.org/" : "https://osfm.fire.ca.gov/", why: "Required for any commercial cooking. Tag must be visible." },
      { id: "grease-trap", name: "Grease trap pumping log", priority: "required", authority: "Local sanitation district", renewal: "Quarterly typically", url: sf ? "https://sfpuc.org/" : "", why: "Health inspectors check the log. Sewer overflow = big fines." },
      { id: "music-license", name: "Music licensing (ASCAP/BMI/SESAC)", priority: "conditional", authority: "Performance rights orgs", renewal: "Annual", url: "https://www.ascap.com/help/ascap-licensing", why: "If you play recorded or live music in your business." }
    ],
    "coffee shop": [
      { id: "health-permit", name: "Retail food facility health permit", priority: "required", authority: sf ? "SF Department of Public Health" : "County environmental health", renewal: "Annual", url: sf ? "https://www.sf.gov/get-health-permit-open-restaurant-bar-or-other-retail-food-location" : "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "Required for any food/beverage prep." },
      { id: "food-handler", name: "Food handler cards", priority: "required", authority: "California Food Handler program", renewal: "3 years per employee", url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "All food-touching staff must have one within 30 days of hire." },
      { id: "outdoor-seating", name: "Sidewalk café / outdoor seating permit", priority: "conditional", authority: sf ? "SF Public Works" : "Local public works", renewal: "Annual", url: sf ? "https://www.sf.gov/sf-shared-spaces" : "", why: "Required for any tables on public sidewalk." }
    ],
    "food stall": [
      { id: "mff-permit", name: "Mobile Food Facility (MFF) permit", priority: "required", authority: sc ? "Santa Clara County Environmental Health" : sf ? "SFDPH" : "County environmental health", renewal: "Annual", url: sc ? "https://deh.santaclaracounty.gov/food" : sf ? "https://www.sf.gov/" : "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "Required for any mobile food vending. Different categories for prep level." },
      { id: "commissary", name: "Commissary agreement", priority: "required", authority: "Approved commissary kitchen", renewal: "Service term", url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "Required base of operations for cleaning, water, waste disposal." },
      { id: "food-handler", name: "Food handler cards", priority: "required", authority: "CA Food Handler program", renewal: "3 years", url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "All workers." },
      { id: "vendor-permit", name: "Event/vendor permit (per location)", priority: "conditional", authority: "Event organizer or city", renewal: "Per event", url: "", why: "Required at fairs, markets, festivals, campus events." }
    ],
    "grocery": [
      { id: "health-permit", name: "Retail food market health permit", priority: "required", authority: sf ? "SFDPH" : "County environmental health", renewal: "Annual", url: sf ? "https://www.sf.gov/get-health-permit-open-restaurant-bar-or-other-retail-food-location" : "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx", why: "Required for any retail food sales." },
      { id: "weights-measures", name: "Weights & Measures device registration", priority: "required", authority: "County Sealer of Weights & Measures", renewal: "Annual", url: "https://www.cdfa.ca.gov/dms/", why: "Any scale used for sale by weight must be sealed." },
      { id: "wic", name: "WIC vendor authorization (optional)", priority: "recommended", authority: "California WIC Program", renewal: "3 years", url: "https://www.cdph.ca.gov/Programs/CFH/DWICSN/Pages/AuthorizedFood.aspx", why: "Adds a steady customer base if you stock WIC-eligible items." },
      { id: "tobacco", name: "Tobacco retailer permit", priority: "conditional", authority: "California CDTFA + local", renewal: "Annual", url: "https://www.cdtfa.ca.gov/services/permits-licenses.htm", why: "Required if selling any tobacco/vape products." }
    ],
    "retail": [
      { id: "resale-cert", name: "Resale certificate (CDTFA)", priority: "required", authority: "CDTFA", renewal: "Active", url: "https://www.cdtfa.ca.gov/formspubs/cdtfa230.pdf", why: "Lets you buy inventory tax-free. Provide to wholesalers." },
      { id: "alarm-permit", name: "Alarm system permit", priority: "conditional", authority: "Local police department", renewal: "Annual", url: "", why: "Required by most cities for monitored alarms. False-alarm fees if missing." }
    ],
    "salon": [
      { id: "shop-license", name: "Establishment / salon license", priority: "required", authority: "California Board of Barbering and Cosmetology", renewal: "2 years", url: "https://www.barbercosmo.ca.gov/forms_pubs/forms.shtml", why: "Required for the salon premises. Separate from individual licenses." },
      { id: "cosmetology-license", name: "Individual cosmetology license per stylist", priority: "required", authority: "CA Board of Barbering and Cosmetology", renewal: "2 years per person", url: "https://www.barbercosmo.ca.gov/", why: "Each stylist must hold a valid license. Inspectors verify." },
      { id: "sanitation", name: "Sanitation/sterilization log + UV-C cabinet", priority: "required", authority: "CA BBC sanitation rules", renewal: "Daily log", url: "https://www.barbercosmo.ca.gov/laws_regs/healthsafety.shtml", why: "Tools must be disinfected per rule. Failure = closure." },
      { id: "bbp", name: "OSHA Bloodborne Pathogens training", priority: "required", authority: "OSHA / Cal-OSHA", renewal: "Annual", url: "https://www.osha.gov/bloodborne-pathogens", why: "Required for any service that can cause bleeding (waxing, threading, razors)." }
    ],
    "barbershop": [
      { id: "shop-license", name: "Barbershop establishment license", priority: "required", authority: "CA Board of Barbering and Cosmetology", renewal: "2 years", url: "https://www.barbercosmo.ca.gov/forms_pubs/forms.shtml", why: "Required for the shop." },
      { id: "barber-license", name: "Individual barber license per worker", priority: "required", authority: "CA BBC", renewal: "2 years per barber", url: "https://www.barbercosmo.ca.gov/", why: "Every barber must be licensed." },
      { id: "sanitation", name: "Sanitation/sterilization log + UV-C cabinet", priority: "required", authority: "CA BBC", renewal: "Daily", url: "https://www.barbercosmo.ca.gov/laws_regs/healthsafety.shtml", why: "All clipper guards, blades, combs disinfected per rule." },
      { id: "bbp", name: "OSHA Bloodborne Pathogens training", priority: "required", authority: "OSHA / Cal-OSHA", renewal: "Annual", url: "https://www.osha.gov/bloodborne-pathogens", why: "Required because razors and straight razors can break skin." }
    ],
    "laundromat": [
      { id: "water-sewer", name: "Water/sewer use permit + grease/lint trap", priority: "required", authority: sf ? "SFPUC" : "Local water utility", renewal: "Active", url: sf ? "https://sfpuc.org/" : "", why: "Discharge limits enforced; high water use." },
      { id: "machine-cert", name: "Equipment compliance + tag certifications", priority: "required", authority: "Manufacturer + city building", renewal: "Per inspection cycle", url: "", why: "Commercial dryers must have safety tags; gas-fueled needs separate permit." },
      { id: "ada-laundry", name: "ADA self-service requirements", priority: "required", authority: "DOJ ADA + state", renewal: "Re-check on layout change", url: "https://www.ada.gov/", why: "Self-service businesses face stricter ADA suit risk. Aisle width, machine height." }
    ],
    "pharmacy": [
      { id: "pharmacy-license", name: "California pharmacy license", priority: "required", authority: "California Board of Pharmacy", renewal: "Annual", url: "https://www.pharmacy.ca.gov/", why: "Required to dispense any prescription. Pharmacist-in-charge designated." },
      { id: "dea", name: "DEA registration (controlled substances)", priority: "required", authority: "Drug Enforcement Administration", renewal: "3 years", url: "https://www.deadiversion.usdoj.gov/", why: "Required for any Schedule II-V drugs. ~$888." },
      { id: "controlled-log", name: "Controlled substance dispensing log", priority: "required", authority: "DEA + CA BoP", renewal: "Daily", url: "https://www.deadiversion.usdoj.gov/", why: "DEA can audit. Discrepancies trigger investigation." },
      { id: "hipaa", name: "HIPAA compliance program", priority: "required", authority: "HHS Office for Civil Rights", renewal: "Annual review", url: "https://www.hhs.gov/hipaa/for-professionals/index.html", why: "Patient health info protection. Breaches = big fines." },
      { id: "tobacco", name: "Tobacco retailer permit", priority: "conditional", authority: "CA CDTFA + local", renewal: "Annual", url: "https://www.cdtfa.ca.gov/services/permits-licenses.htm", why: "Most pharmacies sell tobacco." }
    ],
    "daycare": [
      { id: "ccld-license", name: "Community Care Licensing Division (CCLD) license", priority: "required", authority: "California Department of Social Services", renewal: "Active + annual fee", url: "https://www.cdss.ca.gov/inforesources/community-care-licensing", why: "Required for any childcare facility. Full inspection cycle." },
      { id: "background-checks", name: "Live-Scan background checks (every staff member)", priority: "required", authority: "CA CCLD + DOJ", renewal: "Per hire", url: "https://oag.ca.gov/fingerprints", why: "All staff including volunteers must be cleared before contact with kids." },
      { id: "first-aid-cpr", name: "Pediatric first aid + CPR (every teacher)", priority: "required", authority: "American Red Cross or equivalent", renewal: "2 years per cert", url: "https://www.redcross.org/take-a-class/first-aid", why: "Required ratio of certified staff per CCLD rules." },
      { id: "immunizations", name: "Child immunization records (per child)", priority: "required", authority: "CDPH Shots for School", renewal: "Per enrollment", url: "https://eziz.org/assets/docs/shotsforschool/CCFRGAR.pdf", why: "California requires proof of immunization for childcare admission." },
      { id: "fire-evac", name: "Fire evacuation drills + log", priority: "required", authority: "Local fire department + CCLD", renewal: "Monthly drills", url: "", why: "Documented monthly drills required by CCLD." }
    ],
    "auto repair": [
      { id: "bar-license", name: "Bureau of Automotive Repair (BAR) registration", priority: "required", authority: "California BAR", renewal: "Annual", url: "https://www.bar.ca.gov/", why: "Required for any automotive repair shop in CA. BAR # must be on every estimate/invoice." },
      { id: "smog-license", name: "Smog Check station / inspector license (if applicable)", priority: "conditional", authority: "California BAR", renewal: "Per cert", url: "https://www.bar.ca.gov/business_resources/smog_check_program/index.html", why: "Required to perform smog inspections. Star vs regular station distinction." },
      { id: "haz-waste", name: "Hazardous waste generator ID + manifest", priority: "required", authority: "California DTSC", renewal: "Active", url: "https://dtsc.ca.gov/hazardous-waste-generators/", why: "Used oil, antifreeze, parts cleaners are hazardous waste. Must track and document disposal." },
      { id: "epa", name: "EPA Section 609 (refrigerant handling)", priority: "conditional", authority: "EPA", renewal: "One-time per technician", url: "https://www.epa.gov/section608", why: "Required for any technician working with vehicle AC refrigerant." },
      { id: "tire-fee", name: "Tire fee collection registration", priority: "conditional", authority: "CDTFA", renewal: "Active", url: "https://www.cdtfa.ca.gov/taxes-and-fees/tire-fee.htm", why: "If you sell tires, $1.75/tire fee owed to state." }
    ],
    "liquor store": [
      { id: "abc-type-21", name: "ABC Type 21 license (off-sale general)", priority: "required", authority: "California ABC", renewal: "Annual", url: "https://www.abc.ca.gov/licensing/license-types/", why: "Required for off-sale beer, wine, distilled spirits. License caps + transfer cost is significant." },
      { id: "tobacco", name: "Tobacco retailer permit", priority: "required", authority: "CDTFA + local", renewal: "Annual", url: "https://www.cdtfa.ca.gov/services/permits-licenses.htm", why: "Most liquor stores sell tobacco. Strict ID verification." },
      { id: "lottery", name: "California Lottery retailer license", priority: "conditional", authority: "California State Lottery", renewal: "Annual", url: "https://www.calottery.com/retailers", why: "If selling scratchers or draw tickets." },
      { id: "abc-poster", name: "ABC age-verification posting + training", priority: "required", authority: "California ABC", renewal: "Active", url: "https://www.abc.ca.gov/education/", why: "Stings are common. Failure = license suspension + fines." }
    ],
    "default": [
      { id: "industry-research", name: "Industry-specific licenses & permits", priority: "recommended", authority: "California Department of Consumer Affairs", renewal: "Per industry", url: "https://www.dca.ca.gov/about_us/licensees.shtml", why: "Look up your specific industry to confirm any state-level licensing." }
    ]
  };
  return list[type] || list["default"];
}

function normalizeType(type) {
  const clean = String(type || "retail").toLowerCase().trim();
  const map = {
    cafe: "restaurant",
    food: "restaurant",
    "food stall": "food stall",
    stall: "food stall",
    "campus food": "food stall",
    grocery: "grocery",
    shop: "retail",
    store: "retail",
    salon: "salon",
    barber: "barbershop",
    barbershop: "barbershop",
    laundromat: "laundromat",
    pharmacy: "pharmacy",
    daycare: "daycare",
    auto: "auto repair"
  };
  return map[clean] || clean;
}

function businessNewsTerms(type) {
  const normalized = normalizeType(type);
  const terms = {
    restaurant: ["restaurant", "food", "dining", "menu", "health inspection"],
    grocery: ["grocery", "food", "retail", "produce", "market"],
    retail: ["retail", "shop", "storefront", "shopping", "merchant"],
    salon: ["salon", "beauty", "retail", "appointment"],
    barbershop: ["barber", "barbershop", "beauty", "appointment"],
    laundromat: ["laundromat", "laundry", "utility", "water"],
    pharmacy: ["pharmacy", "healthcare", "retail"],
    daycare: ["daycare", "childcare", "school", "family"],
    "auto repair": ["auto repair", "mechanic", "vehicle", "garage"]
  };
  return terms[normalized] || ["small business", "retail", "storefront"];
}

function cityTrendTerms(type) {
  const normalized = normalizeType(type);
  const common = [
    "\"things to do\"",
    "festival",
    "concert",
    "event",
    "campus",
    "\"foot traffic\"",
    "tourism",
    "opening",
    "development",
    "apartments",
    "\"small business\"",
    "grant",
    "weather",
    "shopping"
  ];
  const byType = {
    restaurant: ["restaurant", "dining", "food", "menu", "lunch", "coffee", "\"restaurant week\"", "\"late night\""],
    grocery: ["grocery", "market", "produce", "snacks", "food", "families"],
    retail: ["retail", "shopping", "store", "mall", "pop-up", "fashion"],
    salon: ["salon", "beauty", "appointment", "wedding", "prom", "fashion"],
    barbershop: ["barber", "haircut", "grooming", "appointment", "wedding", "graduation"],
    laundromat: ["laundry", "laundromat", "apartments", "students", "move-in", "rain"],
    pharmacy: ["pharmacy", "health", "allergy", "heat", "air quality", "cold", "flu"],
    daycare: ["childcare", "family", "school", "parents", "summer camp"],
    "auto repair": ["traffic", "road trip", "commute", "vehicle", "parking", "travel"]
  };
  return uniqueStrings([...(byType[normalized] || []), ...common]);
}

function regulatoryTerms(type) {
  const common = ["storefront", "small business", "permit", "license", "inspection"];
  const terms = {
    restaurant: ["restaurant", "food", "health permit", "food handler", "retail food"],
    grocery: ["grocery", "food", "retail food", "health permit"],
    retail: ["retail", "storefront", "seller permit", "sales tax"],
    salon: ["salon", "cosmetology", "license"],
    barbershop: ["barber", "barbershop", "license"],
    laundromat: ["laundromat", "water", "utility", "environmental"],
    pharmacy: ["pharmacy", "health", "license"],
    daycare: ["daycare", "childcare", "license"],
    "auto repair": ["auto repair", "mechanic", "environmental", "hazardous waste"]
  };
  return uniqueStrings([...(terms[type] || []), ...common]).map((term) => `"${term}"`);
}

function officialRegulatoryItems(profile) {
  const checklist = licenseChecklistFor(profile);
  const items = checklist.slice(0, 5).map((item) => ({
    title: item.name,
    name: item.name,
    domain: item.authority,
    source: item.authority,
    status: item.priority,
    url: item.url
  }));

  if (isSanFrancisco(profile)) {
    items.unshift({
      title: "SF Office of Small Business: permits, storefront rules, grants and policy support",
      name: "SF Office of Small Business",
      domain: "SF.gov",
      source: "SF.gov",
      status: "official",
      url: "https://www.sf.gov/departments/office-economic-and-workforce-development/office-small-business"
    });
  } else if (String(profile.city || "").toLowerCase().includes("santa clara")) {
    items.unshift({
      title: "City of Santa Clara business services and tax certificate",
      name: "Santa Clara business services",
      domain: "santaclaraca.gov",
      source: "City of Santa Clara",
      status: "official",
      url: "https://www.santaclaraca.gov/business-development/business-services"
    });
  }

  return items;
}

function buildGeocodeQueries(profile) {
  const address = String(profile.address || "").trim();
  const city = String(profile.city || "").trim();
  const state = String(profile.state || "").trim();

  if (!address) return uniqueStrings([[city, state].filter(Boolean).join(", ")].filter(Boolean));

  const addressLower = address.toLowerCase();
  const hasComma = address.includes(",");
  const namedPlace = namedPlaceFromAddress(address);
  const looksLikeNamedPlace = Boolean(namedPlace) || /\b(university|campus|college|airport|mall|center|plaza|market|station|park|pier|hospital)\b/i.test(address);
  const queries = [];

  if (namedPlace) {
    queries.push([namedPlace, state].filter(Boolean).join(", "));
  }

  if (hasComma || looksLikeNamedPlace) {
    const parts = [address];
    if (state && !addressLower.includes(state.toLowerCase()) && !/\b[A-Z]{2}\b/.test(address)) parts.push(state);
    queries.push(parts.join(", "));
    return uniqueStrings(queries);
  }

  const parts = [address];
  if (city && !addressLower.includes(city.toLowerCase())) parts.push(city);
  if (state && !addressLower.includes(state.toLowerCase())) parts.push(state);
  queries.push(parts.filter(Boolean).join(", "));
  return uniqueStrings(queries);
}

function newsLocationTerms(profile) {
  const terms = [];
  const city = String(profile.city || "").trim();
  const address = String(profile.address || "").trim();
  const place = namedPlaceFromAddress(address);

  if (place) terms.push(place);
  if (city) terms.push(city);

  const addressLead = address.split(",")[0]?.trim();
  if (addressLead && addressLead.length >= 4 && addressLead.length <= 70 && !/^\d+\s/.test(addressLead)) {
    terms.push(addressLead);
  }

  const label = String(profile.locationLabel || "");
  const labelParts = label.split(",").map((part) => part.trim()).filter(Boolean);
  for (const part of labelParts.slice(0, 3)) {
    if (part.length >= 4 && part.length <= 70 && !/^\d+\s/.test(part)) terms.push(part);
  }

  return uniqueStrings(terms)
    .filter((term) => !/^(california|united states|usa|ca)$/i.test(term))
    .slice(0, 4);
}

function namedPlaceFromAddress(address) {
  const text = String(address || "").replace(/\s+/g, " ").trim();
  const university = text.match(/\b([A-Z][A-Za-z&.'-]*(?:\s+[A-Z][A-Za-z&.'-]*){0,5}\s+University)\b/);
  if (university) return university[1];
  const college = text.match(/\b([A-Z][A-Za-z&.'-]*(?:\s+[A-Z][A-Za-z&.'-]*){0,5}\s+College)\b/);
  if (college) return college[1];
  const campus = text.match(/\b([A-Z][A-Za-z&.'-]*(?:\s+[A-Z][A-Za-z&.'-]*){0,5}\s+Campus)\b/);
  if (campus) return campus[1];
  return "";
}

function localizeArticles(articles, terms) {
  const usefulTerms = uniqueStrings(terms)
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 4);

  if (!usefulTerms.length) return articles;

  const localized = articles.filter((article) => {
    const haystack = `${article.title || ""} ${article.domain || ""} ${article.url || ""}`.toLowerCase();
    return usefulTerms.some((term) => haystack.includes(term));
  });

  return localized.length ? localized : articles;
}

function ownerRelevantArticles(articles, profile) {
  const city = String(profile.city || "").toLowerCase();
  const localTerms = newsLocationTerms(profile)
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 4);
  const knownCities = [
    "san francisco",
    "santa clara",
    "san jose",
    "sunnyvale",
    "cupertino",
    "mountain view",
    "palo alto",
    "milpitas",
    "oakland",
    "berkeley"
  ];

  return (articles || []).filter((article) => {
    const haystack = `${article.title || article.name || ""} ${article.description || ""} ${article.domain || ""} ${article.url || ""}`.toLowerCase();
    const hasLocalTerm = localTerms.some((term) => haystack.includes(term));
    if (hasLocalTerm || !city) return true;
    if (/(bay area|silicon valley|santa clara county|california|statewide)/i.test(haystack)) return true;
    const conflictingCity = knownCities.find((name) => name !== city && haystack.includes(name));
    return !conflictingCity;
  });
}

function isLikelyRemoteSportsArticle(article) {
  const title = String(article?.title || article?.name || "").toLowerCase();
  const domain = String(article?.domain || article?.url || "").toLowerCase();
  const text = `${title} ${domain}`;
  if (!/(sports|athletic|athletics|ncaa|sooner|wccsports|west coast conference|espn|cbssports|teamrankings|college)/i.test(text)) return false;
  if (/(levi'?s stadium|santa clara convention center|santa clara, ca|in santa clara|at santa clara|home game|campus event|commencement|graduation|festival|concert|parade|market)/i.test(title)) return false;
  if (/\b(at|vs\.?|versus)\b/i.test(title)) return true;
  return !/(super bowl|large event|tourism|foot traffic)/i.test(title);
}

function buildCityTrendPlays(articles, profile) {
  return uniqueTrendPlays((articles || [])
    .map((article) => cityTrendPlayFromArticle(article, profile))
    .filter(Boolean)
  );
}

function uniqueTrendPlays(plays) {
  const seen = new Set();
  return (plays || [])
    .filter(Boolean)
    .filter((play) => {
      const key = `${play.trend}-${play.headline}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function buildFeedTrendPlays(feeds, profile) {
  const type = normalizeType(profile.businessType);
  const plays = [];
  const marketSummary = feeds.marketScan?.summary;
  if (marketSummary) {
    const competitorCount = Number(marketSummary.competitorCount || 0);
    const trend = marketTrendForType(type);
    const play = profitPlayForType(type, trend, profile.city || "your city");
    if (play) {
      plays.push({
        trend,
        severity: "opportunity",
        score: 66 + Math.min(20, competitorCount),
        name: play.name,
        headline: play.headline,
        metric: competitorCount ? `${competitorCount} comparable places` : "City market pattern",
        body: play.body,
        action: play.action,
        pointers: play.pointers,
        source: "City map",
        url: feeds.marketScan?.sourceUrl,
        evidenceTitle: "City market scan",
        ownerReady: true
      });
    }
  }

  const daily = feeds.weather?.daily || {};
  const maxTemp = max(daily.temperature_2m_max);
  const maxRain = max(daily.precipitation_probability_max);
  if (Number.isFinite(maxTemp) && maxTemp >= 80 || Number.isFinite(maxRain) && maxRain >= 45) {
    const play = profitPlayForType(type, "weather", profile.city || "your city");
    if (play) {
      plays.push({
        trend: "weather",
        severity: "opportunity",
        score: 74,
        name: play.name,
        headline: play.headline,
        metric: Number.isFinite(maxTemp) ? `High near ${Math.round(maxTemp)} F` : `${Math.round(maxRain)}% rain chance`,
        body: play.body,
        action: play.action,
        pointers: play.pointers,
        source: "Open-Meteo",
        url: readableEvidenceUrl(profile, feeds.weather?.sourceUrl),
        when: Number.isFinite(maxTemp) ? forecastPeakLabel(daily, daily.temperature_2m_max, "heat") : forecastPeakLabel(daily, daily.precipitation_probability_max, "rain"),
        evidenceTitle: "Weekly city forecast",
        ownerReady: true
      });
    }
  }

  return plays;
}

function marketTrendForType(type) {
  const map = {
    restaurant: "dining",
    "food stall": "dining",
    grocery: "grocery",
    retail: "shopping",
    salon: "beauty",
    barbershop: "beauty",
    laundromat: "laundry",
    pharmacy: "health",
    daycare: "family",
    "auto repair": "auto"
  };
  return map[type] || "shopping";
}

function cityTrendPlayFromArticle(article, profile) {
  const type = normalizeType(profile.businessType);
  const city = profile.city || "your city";
  const text = `${article?.title || article?.name || ""} ${article?.description || ""} ${article?.domain || ""}`.toLowerCase();
  const trend = classifyCityTrend(text, type);
  if (!trend) return null;
  if (trend === "event" && !hasReliableEventTiming(article)) return null;

  const play = profitPlayForType(type, trend, city);
  if (!play) return null;

  return {
    trend,
    severity: trend === "risk" ? "warning" : "opportunity",
    score: trendScore(trend, text),
    name: play.name,
    headline: play.headline,
    metric: article.when || trendLabel(trend),
    body: play.body,
    action: play.action,
    pointers: play.pointers,
    source: article.domain || article.source || "Local trend scan",
    url: article.url,
    when: article.when,
    evidenceTitle: compactHeadline(article.title || article.name || "City trend")
  };
}

function classifyCityTrend(text, type) {
  if (/(grant|rebate|funding|loan|small business support|award|best|ranked)/i.test(text)) return "support";
  if (/(festival|concert|convention|parade|farmers market|night market|street fair|super bowl|commencement|graduation|move-in|parents weekend|large event|things to do|tourism)/i.test(text)) return "event";
  if (/(record enrollment|enrollment|new students|student housing|campus|university|college|school year|semester|families|parents)/i.test(text)) return "campus";
  if (/(apartment|housing|development|new residents|residents|office|jobs|hiring|opening|opens|new store|downtown|corridor)/i.test(text)) return "growth";
  if (/(heat|hot|temperature|summer|air quality|smoke|allergy|rain|storm|wet weather|cold|flu)/i.test(text)) return "weather";
  if (/(shopping|retail|mall|storefront|pop-up|fashion|boutique|marketplace|merchant)/i.test(text)) return "shopping";
  if (type === "restaurant" && /(restaurant|dining|food|coffee|cafe|lunch|menu|chef|taco|pizza|burger|bakery)/i.test(text)) return "dining";
  if (type === "grocery" && /(grocery|market|produce|food|snack|families|meal)/i.test(text)) return "grocery";
  if ((type === "salon" || type === "barbershop") && /(beauty|salon|barber|hair|wedding|prom|graduation|fashion)/i.test(text)) return "beauty";
  if (type === "laundromat" && /(laundry|laundromat|apartments|students|rain|move-in)/i.test(text)) return "laundry";
  if (type === "pharmacy" && /(health|pharmacy|allergy|heat|air quality|cold|flu|wellness)/i.test(text)) return "health";
  if (type === "daycare" && /(school|family|parents|childcare|summer camp|kids)/i.test(text)) return "family";
  if (type === "auto repair" && /(traffic|road trip|commute|vehicle|parking|travel|construction)/i.test(text)) return "auto";
  return null;
}

function profitPlayForType(type, trend, city) {
  const label = labelForType(type).toLowerCase();
  const generic = {
    event: {
      name: "Event trend",
      headline: `City trend: event traffic can lift ${label} sales`,
      body: `Trending in ${city}: events or visitor activity may create a short demand window. Profit angle for this ${label}: package a clear, time-boxed offer and make it easy to buy fast.`,
      action: "Create one event-window offer, staff the likely peak hour, and track redemptions so you know if the trend paid off.",
      pointers: ["Pick peak window", "Create one offer", "Post locally", "Track redemptions"]
    },
    campus: {
      name: "Campus trend",
      headline: `City trend: campus demand can lift ${label} traffic`,
      body: `Trending in ${city}: campus or student activity can shift customer timing. Profit angle for this ${label}: aim a simple student/family offer at the highest-traffic window.`,
      action: "Build a student or family offer, put it on signage/social, and prepare inventory or appointments for the likely rush.",
      pointers: ["Target students", "Time the offer", "Prepare capacity", "Track sales"]
    },
    growth: {
      name: "Growth trend",
      headline: `City trend: new local demand can grow ${label} revenue`,
      body: `Trending in ${city}: development, jobs or new residents can change who is nearby. Profit angle for this ${label}: make discovery easier before new customers choose a competitor.`,
      action: "Update listings, photos, hours and one introductory offer tied to the nearby growth area.",
      pointers: ["Update listing", "Add intro offer", "Improve signage", "Track new customers"]
    },
    weather: {
      name: "Weather trend",
      headline: `City trend: weather can shift ${label} purchases`,
      body: `Trending in ${city}: weather and seasonal conditions can change what people buy and whether they walk in. Profit angle for this ${label}: promote the items or services people need in that condition.`,
      action: "Feature the weather-relevant item or service, adjust staffing and push pickup/delivery if foot traffic may drop.",
      pointers: ["Feature seasonal item", "Adjust staffing", "Push pickup/delivery", "Watch margin"]
    },
    shopping: {
      name: "Shopping trend",
      headline: `City trend: shopping interest can lift ${label} visibility`,
      body: `Trending in ${city}: shopping or merchant activity can bring comparison traffic. Profit angle for this ${label}: make the best offer easy to see before customers compare nearby options.`,
      action: "Refresh front-of-store messaging, listing photos and one offer that is easy to understand in five seconds.",
      pointers: ["Refresh display", "Update photos", "Clarify offer", "Measure visits"]
    },
    support: {
      name: "Funding trend",
      headline: `City trend: business support may improve ${label} margins`,
      body: `Trending in ${city}: funding, grants, awards or support programs may reduce costs or fund improvements. Profit angle for this ${label}: apply only if eligibility and documents are realistic.`,
      action: "Check eligibility and deadline, then list the documents needed before spending time on the application.",
      pointers: ["Check eligibility", "Check deadline", "List documents", "Save follow-up"]
    }
  };

  const byType = {
    restaurant: {
      event: ["Event trend", "City trend: event crowds can lift food sales", `Trending in ${city}: events can create fast meal and snack demand. Profit angle for this restaurant: sell a limited combo that is quick to prep and easy to order.`, "Launch one event combo, prep top sellers, staff the rush window and promote pickup/delivery before the event starts.", ["Build event combo", "Prep top sellers", "Staff rush window", "Promote pickup"]],
      campus: ["Campus trend", "City trend: campus demand can grow meal traffic", `Trending in ${city}: student or campus activity can change lunch, dinner and late-snack demand. Profit angle for this restaurant: target the right time window with a student-friendly item.`, "Create a student meal deal, post it near campus channels, and stock the fastest-selling items for the peak window.", ["Create student deal", "Stock fast sellers", "Post near campus", "Track redemptions"]],
      dining: ["Dining trend", "City trend: dining competition can lift better offers", `Trending in ${city}: customers have comparable dining choices nearby. Profit angle for this restaurant: make one menu item, price point or combo easier to choose than competitors.`, "Compare nearby menus/photos, then promote one high-margin item or combo with clear pricing.", ["Compare menus", "Feature high-margin item", "Update photos", "Track redemptions"]],
      weather: ["Weather trend", "City trend: weather can shift food orders", `Trending in ${city}: heat, rain or air quality can change dine-in, patio and delivery behavior. Profit angle for this restaurant: push cold items, comfort food or delivery depending on the forecast.`, "Match the menu highlight to the weather, adjust prep, and push pickup/delivery if walk-ins may slow.", ["Highlight right item", "Tune prep", "Push delivery", "Watch waste"]]
    },
    "food stall": {
      event: ["Event trend", "City trend: event crowds can lift quick food sales", `Trending in ${city}: events can create short bursts of hungry customers. Profit angle for this food stall: make one fast combo and reduce ordering friction.`, "Prep a fast combo, simplify the menu board and staff the busiest window.", ["Simplify menu", "Prep combo", "Speed checkout", "Track sellouts"]],
      campus: ["Campus trend", "City trend: campus traffic can lift food-stall sales", `Trending in ${city}: campus activity can create predictable student rushes. Profit angle for this food stall: align prep with class/event timing.`, "Offer one student combo, prep before the rush and post where campus customers will see it.", ["Time class rush", "Offer combo", "Prep ahead", "Post locally"]]
    },
    grocery: {
      event: ["Event trend", "City trend: events can lift snack and drink sales", `Trending in ${city}: events can increase quick grocery trips. Profit angle for this grocery store: front-load drinks, snacks and ready-to-go items.`, "Create an event shelf near checkout with drinks, snacks and easy meal add-ons.", ["Build event shelf", "Stock drinks", "Bundle snacks", "Track baskets"]],
      campus: ["Campus trend", "City trend: campus demand can lift convenience baskets", `Trending in ${city}: students and families can lift convenience purchases. Profit angle for this grocery store: bundle high-margin snacks, drinks and essentials.`, "Place student/family essentials near checkout and run one small bundle offer.", ["Bundle essentials", "Move to checkout", "Stock snacks", "Track basket size"]],
      grocery: ["Grocery trend", "City trend: local food demand can lift basket size", `Trending in ${city}: nearby grocery and food demand can move quick baskets. Profit angle for this grocery store: bundle essentials around the customer mission.`, "Create one visible bundle near checkout and stock the highest-turn items before the busy window.", ["Bundle essentials", "Stock fast movers", "Move to checkout", "Track basket size"]]
    },
    retail: {
      event: ["Event trend", "City trend: event traffic can lift retail discovery", `Trending in ${city}: event foot traffic can bring shoppers who do not usually visit. Profit angle for this shop: convert passersby with one clear display and a small offer.`, "Put a relevant product bundle up front, add a short-window offer and update listing photos.", ["Front display", "Short-window offer", "Update photos", "Track visits"]],
      shopping: ["Shopping trend", "City trend: shopping attention can lift store visits", `Trending in ${city}: local shopping interest can send customers comparing nearby stores. Profit angle for this shop: make your best product and price point obvious.`, "Refresh the window/display, update photos and run one offer that is easy to understand.", ["Refresh display", "Feature best seller", "Clarify price", "Track visits"]]
    },
    salon: {
      event: ["Event trend", "City trend: events can lift appointment demand", `Trending in ${city}: events can create demand for hair, nails and grooming. Profit angle for this salon: fill open slots with event-ready packages.`, "Promote a limited event-ready appointment package and open a few peak slots.", ["Package service", "Open peak slots", "Post locally", "Track bookings"]],
      beauty: ["Beauty trend", "City trend: beauty attention can lift bookings", `Trending in ${city}: beauty, fashion or celebration activity can move appointment demand. Profit angle for this salon: sell a focused service package instead of discounting everything.`, "Create one focused package, post before the trend window and follow up with repeat-booking offers.", ["Create package", "Post before peak", "Upsell care", "Book follow-up"]]
    },
    barbershop: {
      event: ["Event trend", "City trend: events can lift grooming bookings", `Trending in ${city}: events and celebrations can lift haircut demand. Profit angle for this barbershop: fill near-term appointment gaps with event-ready cuts.`, "Promote a limited grooming slot window and encourage add-ons with high margin.", ["Open slots", "Promote cuts", "Offer add-on", "Track bookings"]],
      beauty: ["Grooming trend", "City trend: grooming demand can lift bookings", `Trending in ${city}: style or celebration activity can increase grooming demand. Profit angle for this barbershop: package cut plus beard/finish add-ons.`, "Bundle a cut with one add-on and push appointments before the trend window.", ["Bundle add-on", "Push bookings", "Prep staff", "Track add-ons"]]
    },
    laundromat: {
      campus: ["Campus trend", "City trend: student activity can lift laundry demand", `Trending in ${city}: student move-ins, events or apartment demand can increase laundry volume. Profit angle for this laundromat: promote wash-fold and rush turnaround.`, "Offer a move-in/student wash-fold special and staff for predictable drop-off windows.", ["Promote wash-fold", "Staff drop-off", "Post locally", "Track pounds"]],
      laundry: ["Laundry trend", "City trend: nearby housing can lift wash-fold demand", `Trending in ${city}: apartments, students or dense housing can increase laundry volume. Profit angle for this laundromat: sell convenience, not just machine time.`, "Promote wash-fold, pickup windows or rush turnaround to nearby residents.", ["Promote wash-fold", "Set pickup window", "Post nearby", "Track pounds"]],
      weather: ["Weather trend", "City trend: weather can lift laundry volume", `Trending in ${city}: rain or seasonal changes can increase laundry and dry-cleaning needs. Profit angle for this laundromat: promote quick-turn service.`, "Push quick-turn wash-fold, prep machines and set clear pickup windows.", ["Push quick-turn", "Prep machines", "Set pickup window", "Track orders"]]
    },
    pharmacy: {
      weather: ["Health trend", "City trend: weather can lift health purchases", `Trending in ${city}: heat, smoke, allergies or cold weather can change pharmacy demand. Profit angle for this pharmacy: bundle practical health items near checkout.`, "Feature a seasonal kit such as allergy, heat, smoke or cold-care items and keep essentials stocked.", ["Build health kit", "Stock essentials", "Move to checkout", "Track baskets"]],
      health: ["Health trend", "City trend: wellness attention can lift pharmacy baskets", `Trending in ${city}: health or wellness attention can create practical purchase demand. Profit angle for this pharmacy: pair needed items with counseling or reminders.`, "Create one wellness shelf and train staff on the two-item add-on suggestion.", ["Build wellness shelf", "Train add-on", "Stock essentials", "Track basket size"]]
    },
    daycare: {
      family: ["Family trend", "City trend: family activity can lift enrollment leads", `Trending in ${city}: school, parent or family activity can create childcare research moments. Profit angle for this daycare: capture inquiries while families are actively planning.`, "Open tour slots, post availability and create a simple inquiry follow-up checklist.", ["Open tour slots", "Post availability", "Capture leads", "Follow up"]],
      campus: ["Campus trend", "City trend: school calendars can lift family demand", `Trending in ${city}: school and campus schedules can shift family routines. Profit angle for this daycare: promote available slots before parents commit elsewhere.`, "Publish availability, tour times and a referral offer for the relevant family window.", ["Publish slots", "Offer tour", "Ask referrals", "Track leads"]]
    },
    "auto repair": {
      auto: ["Travel trend", "City trend: traffic and travel can lift auto service", `Trending in ${city}: travel, traffic or commute changes can make maintenance more urgent. Profit angle for this auto shop: sell quick inspections and high-trust preventive service.`, "Promote a pre-trip or commute-readiness inspection and reserve fast appointment slots.", ["Promote inspection", "Reserve slots", "Offer add-on", "Track bookings"]],
      event: ["Event trend", "City trend: event travel can lift quick auto checks", `Trending in ${city}: events can increase local driving and parking pressure. Profit angle for this auto shop: promote quick checks before busy travel windows.`, "Offer a fast tire, battery or fluids check before the event window.", ["Promote quick check", "Prep parts", "Reserve slots", "Track bookings"]]
    }
  };

  const typed = byType[type]?.[trend] || byType[type]?.event;
  if (typed) {
    const [name, headline, body, action, pointers] = typed;
    return { name, headline, body, action, pointers };
  }
  return generic[trend] || generic.event;
}

function trendScore(trend, text) {
  const base = { event: 90, campus: 84, growth: 80, weather: 76, shopping: 72, dining: 70, grocery: 70, beauty: 70, laundry: 70, health: 74, family: 74, auto: 72, support: 68 }[trend] || 50;
  const boost = /(today|tomorrow|this week|opens|opening|record|deadline|festival|concert|graduation|commencement|heat|storm)/i.test(text) ? 10 : 0;
  return base + boost;
}

function trendLabel(trend) {
  const labels = {
    event: "Event trend",
    campus: "Campus trend",
    growth: "Growth trend",
    weather: "Weather trend",
    shopping: "Shopping trend",
    dining: "Dining trend",
    grocery: "Grocery trend",
    beauty: "Beauty trend",
    laundry: "Laundry trend",
    health: "Health trend",
    family: "Family trend",
    auto: "Travel trend",
    support: "Funding trend"
  };
  return labels[trend] || "City trend";
}

function currentOrFutureArticles(articles) {
  return (articles || [])
    .map((article) => withArticleTiming(article))
    .filter((article) => !article.timing?.past)
    .sort((a, b) => (a.timing?.start?.getTime?.() || 0) - (b.timing?.start?.getTime?.() || 0));
}

function withArticleTiming(article) {
  const timing = articleTiming(article);
  return {
    ...article,
    timing,
    when: timing?.explicit ? timing.label : ""
  };
}

function isPastDatedArticle(article) {
  return Boolean(articleTiming(article)?.past);
}

function articleTiming(article) {
  const now = new Date();
  const today = startOfDay(now);
  const referenceDate = dateOnly(article?.seenAt) || today;
  const text = articleTimingText(article);
  const explicit = extractDateRange(text, now, referenceDate);
  if (explicit) {
    return {
      ...explicit,
      past: explicit.end < today,
      today: explicit.start <= today && explicit.end >= today,
      explicit: true,
      label: humanDateRange(explicit.start, explicit.end)
    };
  }

  const seen = dateOnly(article?.seenAt);
  if (!seen) return { past: false, today: false, explicit: false, seenOnly: false, label: "" };
  return {
    start: seen,
    end: seen,
    past: seen < today,
    today: sameDay(seen, today),
    explicit: false,
    seenOnly: true,
    label: ""
  };
}

function articleTimingText(article) {
  const title = stripPublisherSuffix(article?.title || article?.name || "", article?.domain || article?.source || "");
  const description = stripPublisherSuffix(article?.description || "", article?.domain || article?.source || "");
  return `${title} ${description}`.replace(/\s+/g, " ").trim();
}

function stripPublisherSuffix(value, publisher = "") {
  let clean = String(value || "").replace(/\s+/g, " ").trim();
  const candidates = [publisher, publisher.replace(/\s*\([^)]*\)\s*$/g, "")].filter(Boolean);
  for (const candidate of candidates) {
    clean = clean.replace(new RegExp(`\\s+[-–—|]\\s+${escapeRegExp(candidate)}$`, "i"), "").trim();
  }
  return clean;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDateRange(text, now = new Date(), referenceDate = now) {
  const clean = String(text || "").replace(/\s+/g, " ");
  const today = startOfDay(now);
  const referenceDay = startOfDay(referenceDate || now);
  if (/\btoday\b/i.test(clean) && hasReliableRelativeDateLanguage(clean, "today")) {
    return { start: referenceDay, end: referenceDay };
  }
  if (/\btomorrow\b/i.test(clean) && hasReliableRelativeDateLanguage(clean, "tomorrow")) {
    const d = addDays(referenceDay, 1);
    return { start: d, end: d };
  }
  if (/\bthis weekend\b/i.test(clean)) {
    const saturday = nextWeekday(referenceDay, 6, true);
    return { start: saturday, end: addDays(saturday, 1) };
  }

  const month = monthRegex();
  const range = clean.match(new RegExp(`\\b(${month})\\.?\\s+(\\d{1,2})(?:\\s*(?:-|–|—|to|through|thru)\\s*(?:(?:(${month})\\.?)\\s*)?(\\d{1,2}))?(?:,?\\s*(20\\d{2}))?`, "i"));
  if (range) {
    const startMonth = monthIndex(range[1]);
    const startDay = Number(range[2]);
    const endMonth = range[3] ? monthIndex(range[3]) : startMonth;
    const endDay = range[4] ? Number(range[4]) : startDay;
    if (!range[5] && !hasFutureDateLanguage(clean)) return null;
    let year = range[5] ? Number(range[5]) : referenceDay.getFullYear();
    let start = safeDate(year, startMonth, startDay);
    let end = safeDate(year, endMonth, endDay);
    if (!start || !end) return null;
    if (!range[5] && start < referenceDay && hasFutureDateLanguage(clean)) {
      year += 1;
      start = safeDate(year, startMonth, startDay);
      end = safeDate(year, endMonth, endDay);
      if (!start || !end) return null;
    }
    if (end < start) end = safeDate(year + 1, endMonth, endDay);
    return { start, end };
  }

  const weekday = clean.match(/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i);
  if (weekday && hasFutureDateLanguage(clean)) {
    const d = nextWeekday(referenceDay, weekdayIndex(weekday[1]), true);
    return { start: d, end: d };
  }

  return null;
}

function hasReliableRelativeDateLanguage(text, word) {
  const clean = String(text || "").replace(/\s+/g, " ");
  const term = word === "tomorrow" ? "tomorrow" : "today|tonight";
  const signal = "(alert|warning|forecast|meeting|hearing|event|festival|concert|game|market|storm|rain|heat|closure|closed|outage|maintenance|construction|inspection|sale|starts?|begins?|opens?|closes?|runs?|scheduled|set|due|deadline|expected)";
  return new RegExp(`\\b(${term})\\b.{0,36}\\b${signal}\\b`, "i").test(clean)
    || new RegExp(`\\b${signal}\\b.{0,36}\\b(${term})\\b`, "i").test(clean)
    || new RegExp(`\\b(${term})\\b\\s+(only|at|from|through|until|before|after|by|starting)\\b`, "i").test(clean);
}

function hasFutureDateLanguage(text) {
  return /\b(today|tomorrow|this weekend|this week|next week|upcoming|coming|will|set for|scheduled|to host|hosts|returns|opens|opening|starts|begins|runs|through|from|during|deadline)\b/i.test(String(text || ""));
}

function hasReliableEventTiming(article) {
  const timing = article?.timing || articleTiming(article);
  if (timing?.explicit && !timing.past) return true;
  return false;
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const clean = String(value || "").replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function stripCounty(value) {
  return String(value || "").replace(/\s+County$/i, "").trim();
}

function knownLocationFallback(profile, query) {
  const text = `${profile.address || ""} ${profile.city || ""} ${query || ""}`.toLowerCase();
  const places = [
    {
      match: "santa clara university",
      lat: 37.3496,
      lon: -121.939,
      city: "Santa Clara",
      state: "CA",
      label: "Santa Clara University, Santa Clara, CA"
    },
    {
      match: "santa clara",
      lat: 37.3541,
      lon: -121.9552,
      city: "Santa Clara",
      state: "CA",
      label: "Santa Clara, CA"
    },
    {
      match: "san jose state",
      lat: 37.3352,
      lon: -121.8811,
      city: "San Jose",
      state: "CA",
      label: "San Jose State University, San Jose, CA"
    },
    {
      match: "stanford",
      lat: 37.4275,
      lon: -122.1697,
      city: "Palo Alto",
      state: "CA",
      label: "Stanford University, Palo Alto, CA"
    },
    {
      match: "uc berkeley",
      lat: 37.8719,
      lon: -122.2585,
      city: "Berkeley",
      state: "CA",
      label: "UC Berkeley, Berkeley, CA"
    }
  ];
  const found = places.find((place) => text.includes(place.match));
  if (!found) return null;
  return {
    ok: false,
    lat: found.lat,
    lon: found.lon,
    city: found.city,
    state: found.state,
    locationLabel: found.label,
    geocoder: "known-place-fallback",
    message: "Geocoder returned no result; used local known-place fallback instead of the San Francisco default."
  };
}

function knownCityScope(profile) {
  const text = `${profile.city || ""} ${profile.address || ""}`.toLowerCase();
  const scopes = [
    {
      match: "santa clara",
      radiusMeters: 11500,
      cityCenterLat: 37.3541,
      cityCenterLon: -121.9552,
      cityScopeLabel: "Santa Clara city-wide",
      cityScopeSource: "known city fallback"
    },
    {
      match: "san francisco",
      radiusMeters: 14500,
      cityCenterLat: 37.7749,
      cityCenterLon: -122.4194,
      cityScopeLabel: "San Francisco city-wide",
      cityScopeSource: "known city fallback"
    },
    {
      match: "san jose",
      radiusMeters: 30000,
      cityCenterLat: 37.3382,
      cityCenterLon: -121.8863,
      cityScopeLabel: "San Jose city-wide",
      cityScopeSource: "known city fallback"
    },
    {
      match: "oakland",
      radiusMeters: 21000,
      cityCenterLat: 37.8044,
      cityCenterLon: -122.2712,
      cityScopeLabel: "Oakland city-wide",
      cityScopeSource: "known city fallback"
    }
  ];
  const found = scopes.find((scope) => text.includes(scope.match));
  if (!found) return null;
  const radiusMeters = clamp(Math.max(found.radiusMeters, distanceMeters(profile.lat, profile.lon, found.cityCenterLat, found.cityCenterLon) + found.radiusMeters), 3000, 85000);
  return {
    radiusMeters,
    cityRadiusMeters: radiusMeters,
    cityCenterLat: found.cityCenterLat,
    cityCenterLon: found.cityCenterLon,
    cityScopeLabel: found.cityScopeLabel,
    cityScopeSource: found.cityScopeSource
  };
}

function labelForType(type) {
  return String(type || "business").replace(/\b\w/g, (m) => m.toUpperCase());
}

function storeAreaLabel(profile) {
  const city = profile.city || "the city";
  const address = String(profile.address || "").replace(/\s+/g, " ").trim();
  if (address) return `${compactPlace(address)} in ${city}`;
  const parts = String(profile.locationLabel || "").split(",").map((part) => part.trim()).filter(Boolean);
  const firstUseful = parts.find((part) => !/^\d+$/.test(part) && part.toLowerCase() !== String(city).toLowerCase());
  if (firstUseful) return `${compactPlace(firstUseful)} in ${city}`;
  return `${city} city-wide`;
}

function compactPlace(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 39)}...` : clean;
}

function severityFromText(text, type) {
  const lower = String(text || "").toLowerCase();
  if (/(homicide|shooting|fire|wildfire|earthquake|outage|closure|bankrupt|lawsuit|theft|robbery|storm|flood|recall)/.test(lower)) return "warning";
  if (/(grant|opening|festival|market|tourism|growth|award|best|new customers|development|apartments|concert|event)/.test(lower)) return "opportunity";
  if (type === "restaurant" && /(inspection|minimum wage|food safety|health)/.test(lower)) return "warning";
  return "info";
}

function ownerArticleInsight(article, profile, group = "Local") {
  const evidenceTitle = compactHeadline(article.title || article.name || "Local update");
  const text = `${article.title || article.name || ""} ${article.description || ""} ${article.domain || ""} ${article.source || ""}`.toLowerCase();
  const type = normalizeType(profile.businessType);
  const city = profile.city || "your city";
  const scope = profile.cityScopeLabel || `${city} city-wide`;
  const area = storeAreaLabel(profile);
  const metric = scope;
  const sourceName = article.domain || article.source || group || "Local update";
  const base = {
    severity: severityFromText(text, type),
    name: sourceName,
    headline: "Local item to review",
    metric,
    body: `City-wide scan found this in ${scope}. Use it only if it affects ${area}, your customers, delivery routes or operating hours.`,
    action: "Confirm location and timing, then choose one action: staffing, inventory, pricing, access, safety or compliance.",
    pointers: ["Check location", "Check timing", "Decide owner action"],
    evidenceTitle
  };
  const result = (fields) => ({ ...base, ...fields });
  const foodBusiness = ["restaurant", "grocery"].includes(type) || /\b(restaurant|cafe|food|grocery|dining|kitchen)\b/.test(text);

  if (foodBusiness && /(ordered closed|closed after|health inspection|inspection score|inspection|violation|vermin|rodent|cockroach|food safety|sanitation|permit suspended|foodborne)/i.test(text)) {
    return result({
      severity: "warning",
      name: "Inspection watch",
      headline: "Inspection risk: check food-safety basics",
      body: "A food-safety closure or inspection story is a practical warning: inspectors and customers may be paying attention. Check temperature logs, sanitizer, pests, food-handler cards and visible permits before service.",
      action: "Run a 15-minute pre-service inspection and fix any food-safety or permit gaps before the next busy window.",
      pointers: ["Check temp logs", "Check sanitizer", "Check pest control", "Check permits"]
    });
  }

  if (/(power outage|outage|blackout|electric|utility|water main|gas leak|boil water)/i.test(text)) {
    return result({
      severity: "warning",
      name: "Utility watch",
      headline: "Utility risk: confirm backup plan",
      body: "A power, water or utility issue can stop sales, spoil inventory, or block food prep and card payments.",
      action: "Confirm backup power, refrigeration, POS, emergency contacts and customer messaging before peak hours.",
      pointers: ["Check backup power", "Protect perishables", "Confirm POS plan", "Message customers"]
    });
  }

  if (/(road closure|street closure|construction|traffic|transit|parking|sidewalk|public works|lane closure|detour)/i.test(text)) {
    return result({
      severity: "warning",
      name: "Access watch",
      headline: "Access risk: check routes and curb access",
      body: "A road, transit, parking or sidewalk change can reduce walk-ins, delay deliveries and make pickup harder.",
      action: "Check whether the affected route touches your block, then adjust delivery notes, pickup instructions and staffing timing.",
      pointers: ["Check customer route", "Check delivery route", "Update pickup notes", "Adjust staffing"]
    });
  }

  if (/(robbery|burglary|theft|shooting|assault|police|fire|public safety|crime|break-in)/i.test(text)) {
    return result({
      severity: "warning",
      name: "Safety watch",
      headline: "Safety risk: review store closing routine",
      body: "A local safety incident can affect customer confidence, staff comfort and closing procedures.",
      action: "Review closing, lighting, cameras, cash handling and staff walkout timing for the next shift.",
      pointers: ["Check lighting", "Check cameras", "Reduce cash exposure", "Set walkout plan"]
    });
  }

  if (/(minimum wage|ordinance|new law|permit|license|inspection|tax|compliance|health department|environmental health)/i.test(text)) {
    return result({
      severity: "warning",
      name: "Rule watch",
      headline: "Compliance risk: check permits and required records",
      body: "A permit, wage, tax or inspection item can affect store records, renewal timing or required postings.",
      action: "Update permit dates, certificates, wage postings and inspection-readiness notes in the store profile.",
      pointers: ["Check permits", "Check postings", "Check certificates", "Save notes"]
    });
  }

  if (/(festival|concert|convention|game|parade|market|campus event|large event|tourism|super bowl|commencement|graduation|move-in|parents weekend)/i.test(text)) {
    return result({
      severity: "opportunity",
      name: "Event watch",
      headline: "Event traffic: prepare inventory and staffing",
      body: "A nearby event can create short traffic spikes and faster-selling items if the timing is close to your store.",
      action: "Confirm event time and distance, then add top-item inventory, coverage for the busy window and one simple offer.",
      pointers: ["Check event time", "Estimate foot traffic", "Stock top sellers", "Staff peak window"]
    });
  }

  if (/(apartment|housing|development|opens|opening|new store|office|residents|jobs|hiring|growth|record enrollment|enrollment|student housing|new students|new class)/i.test(text)) {
    return result({
      severity: "opportunity",
      name: "Demand watch",
      headline: "Demand change: plan for nearby customer traffic",
      body: "A new development, campus item, opening or hiring story can change who is nearby and when they buy.",
      action: "If the affected area overlaps your customer base, adjust ordering, hours, signage or a targeted offer.",
      pointers: ["Identify customers", "Tune inventory", "Adjust hours/signage", "Create one offer"]
    });
  }

  if (/(blue ribbon commission|board of trustees|joins? .*board|appointed|honored|sustainability|wellness program|faculty|research|alumni)/i.test(text)) {
    return result({
      severity: "info",
      name: "Community watch",
      headline: "Community update: no immediate store action",
      body: "This looks like a local institution or community update, not a direct store operation signal. Do not change staffing or inventory unless the audience clearly overlaps your customers.",
      action: "Save it only if you know it affects your customers; otherwise keep the normal plan.",
      pointers: ["Check customer overlap", "No change if unclear", "Save only if relevant"]
    });
  }

  if (/(closed|closure|shutting down|bankrupt|layoff|lawsuit|review:)/i.test(text)) {
    return result({
      severity: "warning",
      name: "Market watch",
      headline: "Market change: check customer demand before reacting",
      body: "A closure, lawsuit, review or market shift can affect customer confidence or competitor traffic, but only if it overlaps your area or audience.",
      action: "Check whether this is near your customers, then decide whether to adjust offer, hours, inventory or messaging.",
      pointers: ["Check distance", "Check audience overlap", "Review competitor offer", "Decide one change"]
    });
  }

  if (/(grant|award|best|ranked|funding|loan|small business support|rebate)/i.test(text)) {
    return result({
      severity: "opportunity",
      name: "Growth watch",
      headline: "Support opportunity: check eligibility",
      body: "A grant, award, rebate or small-business support item may be useful if your store type and city qualify.",
      action: "Check eligibility, deadline and documents needed; save it for follow-up if it fits.",
      pointers: ["Check eligibility", "Check deadline", "List documents", "Save follow-up"]
    });
  }

  if (group === "Market and Competition") {
    return result({
      severity: base.severity === "warning" ? "warning" : "opportunity",
      name: "Market watch",
      headline: "Local demand signal: check if it affects your customers",
      body: "A local business story may change customer traffic, spending or competitor behavior. Treat it as useful only if the place, audience or timing overlaps your store.",
      action: "Map the story to one decision: inventory, staffing, hours, pricing, signage or a small promo.",
      pointers: ["Check affected area", "Check customer fit", "Pick one decision", "Track result"]
    });
  }

  if (group === "Infrastructure") {
    return result({
      severity: "info",
      name: "Access watch",
      headline: `${city} access item: check route impact`,
      body: `The city-wide scan found an access or utility item for ${scope}. It matters if it touches ${area}, customer parking, delivery routing, curb pickup or staff commute.`,
      action: "Before the next peak period, check the evidence location and update pickup/delivery notes only if it affects your route.",
      pointers: ["Check affected street", "Check pickup access", "Tell delivery partners"]
    });
  }

  if (group === "Crime and Safety") {
    return result({
      severity: "info",
      name: "Safety watch",
      headline: `${city} safety item: check closing-route impact`,
      body: `The city-wide scan found a safety story for ${scope}. It matters if it is near ${area}, your delivery route, or the hours when staff open or close.`,
      action: "If the evidence location is nearby, tighten lighting, camera checks, cash handling and staff walkout procedure for the next shift.",
      pointers: ["Check incident area", "Compare store hours", "Review closing"]
    });
  }

  if (group === "Compliance and Licensing") {
    return result({
      severity: "info",
      name: "Rule watch",
      headline: `${city} rule item: confirm store applicability`,
      body: `A rule or permit item surfaced for ${scope}. It matters for this ${labelForType(type).toLowerCase()} if it changes permits, inspections, wage postings, signage, sidewalk use or tax records.`,
      action: "Confirm whether the rule applies to this store type, then save the due date or required document in Store Info.",
      pointers: ["Check store type", "Check due date", "Save record note"]
    });
  }

  if (group === "Opportunities") {
    return result({
      severity: "opportunity",
      name: "Opportunity watch",
      headline: "Local traffic opportunity: verify timing and distance",
      body: "This may bring extra people nearby if the event, place or audience overlaps your store.",
      action: "Confirm timing and distance, then decide whether to add inventory, staff coverage or a short promo.",
      pointers: ["Check timing", "Check distance", "Prep top sellers", "Plan promo"]
    });
  }

  if (group === "Media and Market") {
    return result({
      severity: base.severity === "warning" ? "warning" : "info",
      name: "Media watch",
      headline: base.severity === "warning" ? "Local media warning: check customer impact" : "Local media item: no immediate store action",
      body: "This local story does not clearly point to a staffing, inventory, pricing, safety or compliance change.",
      action: "Keep the normal plan unless you can tie the story to your customers, block or operating hours.",
      pointers: ["Check customer overlap", "No change if unclear", "Save only if relevant"]
    });
  }

  return result({
    severity: base.severity,
    headline: "Local story: check only if it affects operations"
  });
}

function isSanFrancisco(profile) {
  const text = `${profile.address || ""} ${profile.city || ""}`.toLowerCase();
  return text.includes("san francisco") || (Number(profile.lat) > 37.6 && Number(profile.lat) < 37.9 && Number(profile.lon) < -122.3 && Number(profile.lon) > -122.55);
}

function topCounts(values, limit) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function max(values) {
  const nums = (values || []).map(Number).filter(Number.isFinite);
  return nums.length ? Math.max(...nums) : NaN;
}

function numberOrDash(value) {
  return Number.isFinite(value) ? Math.round(value) : "-";
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().replace(/\.\d{3}Z$/, "");
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function addDays(value, days) {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a, b) {
  return a?.getFullYear?.() === b?.getFullYear?.() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function safeDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextWeekday(today, target, includeToday = true) {
  let delta = (target - today.getDay() + 7) % 7;
  if (delta === 0 && !includeToday) delta = 7;
  return addDays(today, delta);
}

function monthRegex() {
  return "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
}

function monthIndex(value) {
  const key = String(value || "").toLowerCase().slice(0, 3);
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key);
}

function weekdayIndex(value) {
  const key = String(value || "").toLowerCase().slice(0, 3);
  return { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }[key] ?? 0;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return NaN;
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bboxAround(lat, lon, degrees) {
  return {
    minLat: lat - degrees,
    maxLat: lat + degrees,
    minLon: lon - degrees,
    maxLon: lon + degrees
  };
}

function compactHeadline(text) {
  const clean = String(text || "Signal").replace(/\s+/g, " ").trim();
  return clean.length > 54 ? `${clean.slice(0, 51)}...` : clean;
}

function dateShort(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "recent";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function humanDateRange(start, end) {
  if (!start || !end) return "";
  if (sameDay(start, end)) {
    return sameDay(start, startOfDay(new Date())) ? "Today" : weekdayLabel(start.toISOString().slice(0, 10));
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const options = sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}

function dateRangeLabel(start, end) {
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  if (!startDate && !endDate) return "";
  if (startDate && endDate) return humanDateRange(startDate, endDate);
  return humanDateRange(startDate || endDate, startDate || endDate);
}

function forecastPeakLabel(daily, values, kind) {
  const nums = (values || []).map(Number);
  let bestIndex = -1;
  let best = -Infinity;
  nums.forEach((value, index) => {
    if (Number.isFinite(value) && value > best) {
      best = value;
      bestIndex = index;
    }
  });
  const date = daily?.time?.[bestIndex];
  if (!date) return "";
  const label = weekdayLabel(date);
  if (kind === "rain") return `Rain risk peaks ${label}`;
  if (kind === "heat") return `Hottest day ${label}`;
  return label;
}

function shortUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return String(url).slice(0, 80);
  }
}

function safeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function clamp(value, min, maxValue) {
  return Math.min(maxValue, Math.max(min, value));
}
