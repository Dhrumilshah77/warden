import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 4173);
const APP_USER_AGENT = "Warden/0.2 (local storefront intelligence; contact: local)";

await loadDotEnv();

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

const server = createServer(async (req, res) => {
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

    if (url.pathname === "/api/intel") {
      const profile = profileFromSearch(url.searchParams);
      const payload = await buildIntel(profile);
      return sendJson(res, 200, payload);
    }

    if (url.pathname === "/api/restock") {
      const profile = profileFromSearch(url.searchParams);
      const payload = buildRestockComparison(profile, url.searchParams);
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
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Warden running at http://127.0.0.1:${PORT}`);
});

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

function redactEnvStatus() {
  return {
    apify: Boolean(process.env.APIFY_TOKEN),
    socrata: Boolean(process.env.SOCRATA_APP_TOKEN)
  };
}

function buildRestockComparison(profile, params) {
  const query = String(params.get("q") || params.get("query") || "").replace(/\s+/g, " ").trim();
  const businessType = normalizeType(profile.businessType || params.get("businessType") || "retail");
  const storeName = profile.businessName || "this store";
  const directCategory = matchRestockCategory(query);
  const category = directCategory || defaultRestockCategory(businessType);
  const searchText = query || category.search;
  const isCustomSearch = Boolean(query && !directCategory);
  const options = (isCustomSearch
    ? customRestockOptions(searchText, businessType)
    : category.options.map((option) => restockOption(option, category, searchText, businessType)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

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
    options
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
    .filter((row) => Number.isFinite(row.distanceMeters) && row.distanceMeters <= profile.radiusMeters)
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
    .filter((row) => Number.isFinite(row.distanceMeters) && row.distanceMeters <= profile.radiusMeters)
    .slice(0, 75);

  return { ok: true, sourceUrl, items, count: items.length };
}

async function fetchMarketScan(profile) {
  const radius = clamp(Number(profile.radiusMeters || profile.cityRadiusMeters || 16000), 3000, 35000);
  const sourceUrl = osmMapUrl(profile);
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
        url: osmElementUrl(element)
      };
    }).filter((item) => item.name && item.category);
    const categories = topCounts(items.map((item) => item.category), 8);
    const sameCategory = competitorCategories(profile.businessType);
    const competitors = items.filter((item) => sameCategory.some((term) => String(item.category).toLowerCase().includes(term))).slice(0, 15);
    return {
      ok: true,
      sourceUrl,
      technicalUrl,
      items: items.slice(0, 80),
      count: items.length,
      summary: {
        radiusMeters: radius,
        topCategories: categories,
        competitorCount: competitors.length,
        sampleCompetitors: competitors.slice(0, 6)
      },
      message: `${profile.city || "City"} OpenStreetMap scan sampled ${items.length} public business/amenity records through Overpass.`
    };
  } catch (error) {
    return {
      ok: false,
      sourceUrl,
      technicalUrl,
      items: [],
      count: 0,
      error: error.message,
      message: "OpenStreetMap Overpass scan did not return in time; other city scans still ran."
    };
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

async function runApifyActor(actorId, input) {
  if (!process.env.APIFY_TOKEN) {
    return {
      ok: false,
      error: "APIFY_TOKEN is not configured.",
      next: "Add APIFY_TOKEN to /Users/dhrumilshah/Warden/.env when you want Actor-backed sources."
    };
  }

  const apiActorId = actorId.replace("/", "~");
  const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(apiActorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(process.env.APIFY_TOKEN)}`;
  try {
    const items = await fetchJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    }, 120000);
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
    signals.push(seedSignal("system", "info", "City checks unavailable", "Try again later", "The city checks did not return enough information. Refresh before making staffing, inventory or safety decisions.", "Warden"));
  }

  const risk = clamp(24 + signals.filter((s) => s.severity === "critical").length * 18 + signals.filter((s) => s.severity === "warning").length * 9, 8, 98);
  const opportunity = clamp(28 + signals.filter((s) => s.severity === "opportunity").length * 12 + Math.min(signals.length, 18) * 2, 10, 96);
  const opportunities = buildOpportunities(profile, feeds, signals, maxOwnerOpportunities);
  const warningSignals = signals.filter((s) => s.severity === "critical" || s.severity === "warning");
  const warnings = buildWarnings(profile, feeds, warningSignals, maxOwnerWarnings);

  for (const item of opportunities.slice(0, 6)) {
    signals.push(signal({
      group: "Opportunities",
      severity: "opportunity",
      code: "OP",
      name: item.type,
      headline: item.title,
      metric: item.impact,
      body: `${item.why} ${item.action}`,
      source: item.source,
      url: item.url
    }));
  }

  const groups = groupSignals(signals);
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
      name: "NWS alert",
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
    source: citySafety?.sourceUrl ? "Local safety news" : "Warden",
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
      source: cityInfrastructure?.sourceUrl ? "Local infrastructure news" : "Warden",
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
      source: "Warden",
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
      source: "Warden synthesis",
      url: null
    });
  }

  return uniqueOwnerItems(warnings).slice(0, maxItems);
}

function buildMetrics(profile, feeds, signals, opportunities, warnings) {
  const healthy = Object.values(feeds).filter((feed) => feed?.ok).length;
  const sourceCount = Object.keys(feeds).length;
  const area = storeAreaLabel(profile);
  const radiusMi = Math.round((profile.radiusMeters || 0) / 1609 * 10) / 10;
  return [
    {
      label: "Monitoring Area",
      value: profile.cityScopeLabel || `${profile.city || "City"} city-wide`,
      detail: `${radiusMi} mi scan around ${area}`,
      tone: "info"
    },
    {
      label: "City Checks",
      value: `${healthy}/${sourceCount}`,
      detail: "Weather, safety, access, permits, market",
      tone: healthy >= Math.max(5, sourceCount - 2) ? "good" : "warn"
    },
    {
      label: "Actionable Warnings",
      value: String(warnings.filter((item) => item.urgency !== "Low").length),
      detail: "Owner decisions to review",
      tone: warnings.some((item) => item.urgency === "High") ? "risk" : "warn"
    },
    {
      label: "Opportunity Plays",
      value: String(opportunities.length),
      detail: "Profit, traffic or conversion plays",
      tone: "good"
    },
    {
      label: "Weather Window",
      value: `${feeds.weather?.count || 0} days`,
      detail: "Rain, heat, wind and staffing impact",
      tone: "info"
    },
    {
      label: "City Signals",
      value: String(signals.length),
      detail: "Concise owner cards below",
      tone: "info"
    }
  ];
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
    weather: "Open-Meteo weather",
    air: "Open-Meteo air quality",
    alerts: "National Weather Service alerts",
    police: "Official police incident feed",
    cases311: "Official 311/city case feed",
    marketScan: "OpenStreetMap city market scan",
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
    restaurant: ["restaurant", "cafe", "fast_food", "bar", "pub", "food"],
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

function osmMapUrl(profile) {
  const lat = Number(profile.lat);
  const lon = Number(profile.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "https://www.openstreetmap.org/";
  return `https://www.openstreetmap.org/#map=13/${lat.toFixed(5)}/${lon.toFixed(5)}`;
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
  const santaClara = city.includes("santa clara");
  const common = [
    {
      id: "business-registration",
      name: "Business registration certificate",
      priority: "required",
      status: "track",
      authority: sf ? "San Francisco Treasurer & Tax Collector" : santaClara ? "City of Santa Clara Finance Department" : "City/County business office",
      renewal: "Annual or local schedule",
      url: sf ? "https://www.sf.gov/register-your-business" : santaClara ? "https://www.santaclaraca.gov/business-development/business-services/business-tax-certificate" : "https://www.ca.gov/service/?item=register-a-business"
    },
    {
      id: "seller-permit",
      name: "California seller's permit",
      priority: "required",
      status: "track",
      authority: "California Department of Tax and Fee Administration",
      renewal: "Keep active while selling taxable goods",
      url: "https://www.cdtfa.ca.gov/services/permits-licenses.htm"
    },
    {
      id: "fbn",
      name: "Fictitious Business Name filing",
      priority: "conditional",
      status: "track",
      authority: "County Clerk",
      renewal: "Usually every 5 years",
      url: sf ? "https://www.sf.gov/renew-change-or-refile-fictitious-business-name-fbn" : "https://www.ca.gov/service/?item=file-a-fictitious-business-name"
    },
    {
      id: "workers-comp",
      name: "Workers' compensation coverage",
      priority: "required",
      status: "track",
      authority: "California DIR",
      renewal: "Policy period",
      url: "https://www.dir.ca.gov/dwc/employer.htm"
    }
  ];

  const restaurant = [
    {
      id: "health-permit",
      name: "Retail food facility health permit",
      priority: "required",
      status: "track",
      authority: sf ? "SF Department of Public Health" : santaClara ? "Santa Clara County Department of Environmental Health" : "County environmental health",
      renewal: "Before opening and on local renewal schedule",
      url: sf ? "https://www.sf.gov/get-health-permit-open-restaurant-bar-or-other-retail-food-location" : santaClara ? "https://deh.santaclaracounty.gov/food" : "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx"
    },
    {
      id: "food-safety-manager",
      name: "Certified food protection manager",
      priority: "required",
      status: "track",
      authority: "California food safety rules",
      renewal: "Certificate expiry",
      url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx"
    },
    {
      id: "food-handler",
      name: "Food handler cards",
      priority: "required",
      status: "track",
      authority: "California food handler program",
      renewal: "Per employee/certificate expiry",
      url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx"
    },
    {
      id: "fire-inspection",
      name: "Fire inspection and extinguisher service tags",
      priority: "required",
      status: "track",
      authority: "Local fire department",
      renewal: "Inspection/service schedule",
      url: sf ? "https://sf-fire.org/" : santaClara ? "https://www.santaclaraca.gov/our-city/departments-a-f/fire-department" : null
    }
  ];

  const storefront = [
    {
      id: "signage-awning",
      name: "Signage, awning or sidewalk-use rules",
      priority: "conditional",
      status: "track",
      authority: sf ? "SF Permit Center / Public Works" : santaClara ? "City of Santa Clara Planning Division" : "Local planning/public works",
      renewal: "When changing storefront use/signage",
      url: sf ? "https://www.sf.gov/topics--business" : santaClara ? "https://www.santaclaraca.gov/business-development/development-services/planning-division" : null
    },
    {
      id: "ada-access",
      name: "ADA accessibility readiness",
      priority: "required",
      status: "track",
      authority: "Federal/state accessibility rules",
      renewal: "Whenever layout changes",
      url: sf ? "https://www.sf.gov/improve-ada-accessibility-your-business" : "https://www.ada.gov/"
    }
  ];

  if (type === "restaurant" || type === "grocery" || type === "pharmacy") return [...common, ...restaurant, ...storefront];
  return [...common, ...storefront];
}

function normalizeType(type) {
  const clean = String(type || "retail").toLowerCase().trim();
  const map = {
    cafe: "restaurant",
    food: "restaurant",
    "food stall": "restaurant",
    stall: "restaurant",
    "campus food": "restaurant",
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
