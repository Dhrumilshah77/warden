# Warden — AI Storefront Intelligence Console

**Built for the All Things Agents hackathon · Powered by Apify + Claude**

Warden is a small-business intelligence console that turns the live web into one daily action plan for any storefront owner. It scrapes Google Maps with Apify Actors, mines public city data, runs the results through Claude for natural-language Q&A, and surfaces everything as concrete owner moves: pricing, peak staffing, signature menu items, compliance documents, and supplier comparisons.

> **Live demo open the moment you clone:** the disk-backed cache ships with this repo, so all 12 SF storefront profiles render instantly without a single API call.

## Hackathon layer: agents acting as real users

The current build includes a sponsor-switchable delegated-action console designed for the May 23, 2026 hackathon prompt:

> Build an AI agent that acts as the right person, with the right access, in the right context.

Open the **Delegated Agent** section near the top of the dashboard. It demonstrates the last mile:

- **Apify** supplies the live evidence behind an action: competitor density, peak demand, review themes, supplier data.
- **Scalekit** is the identity and permission boundary: the same action is allowed for the owner, approval-gated for the manager, and blocked for an associate.
- **Entire.io** is the business system destination: Warden creates campaign, task, order, or CRM-style records as the scoped user.
- **Audit trail** records every allowed, blocked, or approval-required attempt as `user + tenant + role + action + evidence`.
- **Peak Day Autopilot** turns the current intelligence into a one-click prep plan: promo, hours, supplier, and compliance actions are executed, approval-gated, or blocked based on the selected user.
- **Delegation Inbox** supports the 3-tab demo: open `?agentUser=owner-ava`, `?agentUser=manager-ben`, and `?agentUser=associate-mia` in separate browser tabs; each tab keeps its own user, inbox, and shared tenant report trail.
- **Customer Recovery Agent** is a second flagship workflow: Warden detects customer risk, builds a recovery segment, drafts outreach, and gates high-risk credits to the owner.
- **Customer Memory Autopilot** is the safe-autonomy lane: Warden reads demo customer/order memory and automatically creates internal Entire.io tasks, campaign drafts, customer segments, supplier-order drafts, and teammate notes. It never sends customer messages, spends money, changes public profiles, or publishes without owner approval.

It runs in mock mode out of the box so you can demo immediately. Tomorrow, set `SCALEKIT_*` and `ENTIRE_*` env vars to sponsor credentials and point `SCALEKIT_AGENT_PROXY_URL` / `ENTIRE_API_URL` at the live integration endpoints without changing the UI or agent policy code.

---

## What it does in one sentence

For any storefront in a US city, Warden answers:

> *"What should I do today, and why?"*

…by scanning weather, safety, news, regulations, events, hazards — **plus** live competitor data scraped via Apify (Google Places + Amazon products) — and synthesizing it into one dashboard with charts, a city map, an LLM-backed chatbot, and a 29-item compliance hub with authoritative gov links.

---

## Quick start (60 seconds)

```bash
git clone https://github.com/Kush614/warden.git
cd warden
echo "APIFY_TOKEN=your_apify_token"           >  .env
echo "ANTHROPIC_API_KEY=your_anthropic_key"  >>  .env
echo "APIFY_PLACES_ACTOR=compass/crawler-google-places" >> .env
echo "APIFY_PRODUCTS_ACTOR=junglee/amazon-crawler" >> .env
npm run dev
```

Open **http://localhost:4173/**. The 12 preloaded SF storefronts replay from `cache/places-cache.json` instantly — no waiting for Apify on first load.

> **Want to demo without keys?** The dashboard still loads; the Apify-backed sections fall back to OpenStreetMap Overpass and the chatbot falls back to a rule-based responder. Adding the keys unlocks the live data + LLM tier.

---

## What judges should look at

### 1. **Apify is doing real work, not a passthrough**

Two production Actors are wired into the synthesis pipeline:

| Actor | Purpose | What we extract |
|---|---|---|
| `compass/crawler-google-places` | Live competitor scan around the active store | Name, lat/lon, rating, review count, **price tier**, **reviews tags (menu themes)**, **popular times histogram**, address, phone, website, hours |
| `junglee/amazon-crawler` | Live product comparison for any restock query | Title, price, rating, review count, **product image**, ASIN, brand, URL |

Cached to disk in `cache/places-cache.json` and `cache/products-cache.json` (7-day TTL) so demo days don't burn credits, and so cloning the repo gives instant warm data.

### 2. **Synthesis layer turns scrapes into owner decisions**

Run `/api/intel?businessType=restaurant&city=San+Francisco&...` and you get back, in one response:

- **6 visualizations** built from the Apify scrape:
  1. **Block category donut** ("47% Seafood, 13% Italian, 7% Greek...")
  2. **Hours coverage timeline** (24-hour chart of when nearby places are open)
  3. **Popular-times heatmap** (7×24 aggregate of `popularTimesHistogram` across competitors → "Sat 7pm peaks at 93% busy")
  4. **Price-vs-rating scatter** (each competitor as a sized dot, click → Google Maps)
  5. **Price-tier distribution** ($/$$/$$$/$$$$ bars with dominant tier highlighted)
  6. **Review-themes cloud** ("clam chowder · 4,402 mentions across 7 places")

- **5 auto-generated profit-play cards** with cited evidence:
  - *"13 of 15 nearby places stay open past 9pm — pilot extended hours on Fri/Sat"*
  - *"Signature signals in this block: outdoor seating, clam chowder, bar seating, sourdough bread — add the closest match to your menu"*
  - *"Block peaks Sat at 7pm (~93% busy) — staff up 30 min ahead, pre-prep top sellers"*
  - *"Tough block: nearby average is 4.6★ — every new review compounds discovery"*
  - *"Most nearby spots are $$ — differentiate on speed, portion size, or one signature item"*

- **29-item Compliance & Documents hub** organized by category, **every row with an authoritative gov URL**:
  - Industry-specific (changes per business type — restaurant gets health permit + ABC; salon gets cosmetology license; daycare gets CCLD + Live-Scan; pharmacy gets DEA + HIPAA; auto repair gets BAR + hazwaste manifest…)
  - Tax & registration (EIN, BOI/FinCEN, CDTFA seller's permit, SoI)
  - Insurance & coverage (workers' comp, GL, property)
  - Employer & HR (EDD, I-9, posters, minimum wage log)
  - Storefront & accessibility (ADA, CASp, signage, fire extinguisher tags)
  - Records to keep handy (lease, tax records, supplier contracts, employee records)

### 3. **Live LLM chatbot grounded in the scan**

Click the floating "Helper" button. The chatbot:

- Sends the full intel context (warnings, opportunities, weather, marketIntelligence, **nearby places list**, **compliance checklist with URLs**) to **Claude Haiku 4.5** via `/api/chat`
- System prompt aggressively anchors every answer to the active store's name, location, and business type
- Names actual competitors from the Apify scan ("Fog Harbor Fish House 4.5★ 10k reviews"), cites real numbers, links to the gov pages from the compliance list
- Pinned questions adapt to the loaded data (intel-aware green chips like *"Why does this block peak Sat 7pm?"*)
- Falls back gracefully to a rule-based responder if no LLM key is set
- Each live reply badged **⚡ POWERED BY APIFY**

### 4. **Live products with image comparison for ANY storefront type**

In the Restock view, search "takeout containers" / "salon shampoo bowls" / "auto repair brake pads" / etc. The result includes:

- 6 real product cards from `junglee/amazon-crawler` with **scraped images**
- Auto-comparison: cheapest, premium, top-rated, most-reviewed
- Aggregate stats: avg price, avg rating, price spread

### 5. **Disk-backed cache so the demo always works**

Run once: `npm run preload-sf` warms 12 SF storefront types. Result is committed to the repo so anyone who clones has instant data — even days later, even after server restarts. Cache TTL is 7 days; bump the version key in `server.mjs` to invalidate.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Warden (Node.js)                          │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Public APIs    │  │   Apify Actors   │  │  Anthropic API │  │
│  │  (free, no key) │  │   (live scrape)  │  │   (Claude)     │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Synthesis layer (server.mjs)                │  │
│  │  - Aggregate popular-times histograms → block heatmap    │  │
│  │  - Mine reviewsTags → menu/amenity signals               │  │
│  │  - Compute price tier distribution + scatter             │  │
│  │  - Build owner-action recommendations                    │  │
│  │  - Render compliance checklist (industry + universal)    │  │
│  │  - Disk-backed cache (cache/*.json, 7-day TTL)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      /api/intel  /api/restock  /api/chat  /api/health    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Vanilla HTML + JS frontend (no build step, no React)    │  │
│  │  - Leaflet OpenStreetMap (self-hosted, no CDN)           │  │
│  │  - SVG donut + scatter + sparklines + heatmap            │  │
│  │  - Gumroad-inspired dark theme                           │  │
│  │  - Live Helper chat panel with pinned questions          │  │
│  │  - 12 SF demo stores bootstrapped on first load          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data sources

**Apify (paid, live scrapes — the differentiator):**

- `compass/crawler-google-places` — Google Maps competitor data
- `junglee/amazon-crawler` — Amazon product search

**Free public APIs (already wired):**

- Open-Meteo Weather + Air Quality (no key)
- National Weather Service active alerts (no key)
- DataSF SFPD incidents + 311 cases (no key, optional Socrata token)
- OpenStreetMap Overpass (no key, fallback when Apify is off)
- GDELT + Google News RSS (no key)
- USGS earthquake feed (no key)
- NASA EONET (no key)

**LLM:**

- Anthropic Claude Haiku 4.5 (`/api/chat` only)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js native ESM** | Zero dependencies in `package.json`. Just standard library + fetch. |
| Server | **Single `server.mjs` file** | Easy to read, easy to deploy. ~3.7k LOC. |
| Frontend | **Vanilla HTML / CSS / JS** | No build step, no framework. ~3.5k LOC of `app.js`. Loads in 50ms. |
| Map | **Leaflet 1.9.4 (self-hosted)** | No CDN dependency. Works offline. |
| Charts | **Inline SVG** | No chart library. ~10KB total. |
| State | **`localStorage`** | Per-browser persistence. No DB. |
| LLM | **Anthropic Claude Haiku 4.5** | Fast (~2s), cheap (~$0.001-0.002/message), great instruction-following. |
| Scraping | **Apify Actors via run-sync API** | One-shot scrape per query, cached to disk. |

**Total dependency count: 0.** Yes, zero. `package.json` has no `dependencies` block.

---

## File structure

```
warden/
├── server.mjs                    # API + synthesis layer (single file)
├── public/
│   ├── index.html                # App shell + all CSS
│   ├── app.js                    # Frontend rendering + LLM chat client
│   └── vendor/leaflet/           # Self-hosted Leaflet 1.9.4
├── cache/                        # Disk-backed Apify cache (committed)
│   ├── places-cache.json         # 12 SF storefronts preloaded (1.3 MB)
│   └── products-cache.json       # Restock queries cache
├── scripts/
│   ├── preload-sf.mjs            # Warm cache for all 12 SF business types
│   ├── apify-scan.mjs            # CLI test for the Places scraper
│   ├── apify-fields.mjs          # Probe an Actor's response shape
│   └── smoke-test.mjs            # Regression suite
├── api/                          # Vercel function adapters (thin wrappers)
├── docs/                         # Notes on free public data sources
└── .env.example                  # All config knobs documented
```

---

## API surface

### `GET /api/health`
Returns `{ ok, env: { apify, anthropic, socrata } }` showing which integrations are live.

### `GET /api/intel?businessType=...&address=...&city=...&state=...&lat=...&lon=...`
The main scan. Returns one big payload:
- `scores` (risk + opportunity)
- `metrics[]` (6 generic + up to 4 industry-specific cards)
- `banners[]`, `groups[]` (signal cards)
- `opportunities[]`, `warnings[]` (owner action cards)
- `weatherForecast[]` (7 days)
- `marketProvider`, `marketPlaces[]` (Apify or Overpass)
- `marketIntelligence` (price distribution, busyHeatmap, priceVsRating, categoryBreakdown, hoursCoverage, recommendations)
- `licenseChecklist[]` (29 docs across 6 categories with evidence URLs)
- `sourceHealth[]`, `citations[]`

### `GET /api/restock?q=...&businessType=...&city=...`
Supplier comparison. Returns 5 supplier rows + `liveProducts` block with 6 real Amazon products + a `comparison` summary (cheapest/premium/top-rated/most-reviewed).

### `POST /api/chat`
LLM chatbot. Accepts `{ message, store, intel, history }`, returns `{ ok, reply, model, usage }`. Falls back to 503 with `fallback: true` when the Anthropic key is missing — the frontend then runs a regex chatbot instead.

### `GET /api/agent/session`
Returns demo users, current integration modes, and the judging hooks for the delegated-action layer.

### `POST /api/agent/actions`
Accepts `{ userId, store, intel }` and returns recommended user-scoped actions with policy decisions: `allowed`, `needs_approval`, or `blocked`.

### `POST /api/agent/execute`
Executes or records a delegated action. In mock mode it creates a Scalekit-style connected-account result, an Entire-style business record, and an audit event. In live mode it can call `SCALEKIT_AGENT_PROXY_URL` and `ENTIRE_API_URL`.

### `POST /api/agent/autonomy`
Returns the safe-autonomy plan from demo customer/order memory: regular customers, lapsed customers, top items, estimated recovery value, and low-risk actions the agent may create automatically.

### `POST /api/agent/autonomy/run`
Creates the safe-autonomy actions as internal Entire.io drafts/tasks/segments/messages and records `auto_executed` events in the tenant report trail. No public/customer/purchase side effects happen here.

### `GET /api/agent/inbox?userId=...`
Returns approval requests and escalation messages visible to that user, role, and tenant.

### `POST /api/agent/message`
Accepts `{ userId, store, intel, action, toRole }` and creates a delegated message, used when an associate is blocked and needs a manager to pick up the action.

### `POST /api/agent/approve`
Accepts `{ userId, requestId }`. Owner approval executes the stored request as the owner and adds the result to the audit trail.

### `GET /api/agent/audit`
Returns the in-memory audit trail for the current demo run.

### `GET /api/apify/run?actorId=...`
Generic Apify Actor passthrough.

### `GET /api/sources`
Catalog of all 14 data sources for the diagnostics modal.

---

## Visualization gallery (all live in the dashboard)

1. **OpenStreetMap city map** with pulsing pink store marker, green/gold competitor pins (gold = ≥4.5★ + ≥200 reviews), dashed city radius circle. Click any pin → popup with rating, review count, price tier, top 3 review themes, Google Maps link.

2. **Competitor Intelligence section** with 6 cards:
   - Block category donut (SVG) — labels swap per business type
   - Hours coverage 24-hour bar chart with peak-hour gold pulse
   - Popular-times 7×24 heatmap (green→amber→pink) with peak cell ringed in pink
   - Price tier distribution bar chart with dominant tier in gold
   - Review themes chip cloud (mention counts + cross-place spread)
   - Price-vs-rating SVG scatter plot — circles sized by `log(reviews)`, gold for high-quality, hover for tooltip, click → Google Maps

3. **Industry-specific metric cards** at the top: "Block peak demand: Sat 7pm", "Dominant cuisine nearby: Seafood (47%)", "24-hour rivals: 0", "Most-asked service nearby"…

4. **Compliance & Documents hub** — 6 grouped cards with priority pills (red REQUIRED / amber CONDITIONAL / blue RECOMMENDED), authority + renewal cadence, and a blue "View evidence →" button per row linking to the actual gov page.

5. **Weather sparklines** — temperature range bar (gradient blue→pink→red), rain probability bar (teal→blue), wind bar (sage→green) inside each weather card.

6. **Restock block** — supplier comparison table + live Amazon product cards (real images) + automatic comparison block.

---

## What's been demoed end-to-end

- ✅ All 12 SF business types preloaded with 240 places + 12 compliance lists
- ✅ Apify Actors confirmed returning live data (33s for fresh scan, instant from cache)
- ✅ Live Claude chatbot answering store-specific questions with cited intel data
- ✅ Real product images from Amazon scrape ($13.99–$25.99 takeout containers, ratings 4.4-4.5★, up to 25k reviews)
- ✅ OpenStreetMap evidence URLs with marker pins (`?mlat=&mlon=`)
- ✅ Disk cache survives restarts (`Loaded 11 places cache entries from places-cache.json`)
- ✅ Crime/Safety dedupe across Warnings + Signals panels
- ✅ Five UI languages (English, Español, 中文, Tiếng Việt, Filipino)
- ✅ PDF + Email report export
- ✅ Mobile responsive layout with breakpoint adaptations

---

## Configuration

Copy `.env.example` to `.env` and fill in what you have:

```env
APIFY_TOKEN=apify_api_...
APIFY_PLACES_ACTOR=compass/crawler-google-places
APIFY_PRODUCTS_ACTOR=junglee/amazon-crawler
APIFY_PLACES_RADIUS_KM=6
APIFY_MAX_PLACES=10
APIFY_PRODUCTS_MAX=6

ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
GEMINI_API_KEY=optional_gemini_key
GEMINI_MODEL=gemini-2.5-flash

SCALEKIT_ENVIRONMENT_URL=
SCALEKIT_CLIENT_ID=
SCALEKIT_CLIENT_SECRET=
SCALEKIT_AGENT_PROXY_URL=

ENTIRE_API_KEY=
ENTIRE_API_URL=
ENTIRE_WORKSPACE_ID=

SOCRATA_APP_TOKEN=optional
PORT=4173
```

All keys are optional. Missing Apify → falls back to OpenStreetMap Overpass for the market scan and skips the live products. Missing Anthropic but present Gemini → uses Gemini for chat. Missing both LLM keys → falls back to the regex chatbot. Missing Scalekit / Entire → the delegated-action console runs in mock mode with the same policy and audit behavior.

---

## Scripts

```bash
npm run dev           # Start the dev server at :4173
npm run start         # Same as dev
npm run smoke         # Regression suite (server must be running)
npm run apify-login   # Authenticate the Apify CLI
npm run apify-scan "<query>"  # Probe the Google Places Actor
npm run preload-sf    # Warm cache for all 12 SF storefronts (~8 min cold, instant warm)
```

---

## Cost note for judges

A typical demo loop:
- One Apify Places scan: ~$0.05 cold, $0 from cache
- One Apify Products scan: ~$0.005-0.01 cold, $0 from cache
- One Claude Haiku message: ~$0.001-0.002

The repo ships with 12 preloaded SF profiles in `cache/places-cache.json` so judges can clone, set the keys, and demo for $0 of Apify spend on the cached cities. Switching to a non-cached city + business type combo costs about a nickel.

---

## Credits

- **Apify** — provides the live web data layer that makes specific competitor intelligence possible. Sponsored the All Things Agents hackathon. https://apify.com
- **Anthropic Claude** — backs the live chatbot. https://anthropic.com
- **OpenStreetMap + Leaflet** — base map + tile layer, self-hosted.
- **Open-Meteo, NWS, DataSF, GDELT, USGS, NASA EONET** — the free public APIs that complement the Apify-scraped data.

---

## License

Built for the **All Things Agents** hackathon. MIT-style — fork it, ship your own version.
