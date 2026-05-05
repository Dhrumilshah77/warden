# Warden

Warden is a local small-business intelligence dashboard for storefront owners. It scans a city-wide operating area, turns public signals into plain owner actions, and keeps each store's notes, supplies, warnings, opportunities, and chat context in one place.

The project is built for a hack-day demo today with free public APIs first. Apify can be swapped in later as a paid/simple extraction layer without changing the owner-facing workflow.

## What It Does

- Tracks multiple storefronts from the left rail with add/edit/store-info controls.
- Uses the selected city as the automatic monitoring radius instead of asking owners to tune radius values.
- Scans weather, air quality, safety, permits, infrastructure, market movement, media trends, events, and regional hazards.
- Converts raw public links into concise cards with a title, impact, reason, action, checklist, and evidence link.
- Separates warnings from opportunities so owners can act quickly.
- Supports store-specific notes: any useful card can be saved with the date added and the article/signal date.
- Adds a store-aware chatbot that remembers the selected business type, location, warnings, opportunities, weather, notes, and restock context.
- Includes a restock and supplies view for comparing supplier options and purchase links.
- Supports PDF and email report export from the top bar.
- Includes UI translation for English, Spanish, Chinese, Vietnamese, and Filipino.

## Core Screens

- **Overview**: concise risk, opportunity, monitoring, checks, warning, weather, and signal summary.
- **Opportunities**: profit, traffic, weather, competition, media, event, and compliance plays.
- **Warnings**: safety, permit, weather, infrastructure, and regional risk items that need owner review.
- **Weather**: seven-day forecast with temperature, rain probability, wind, and source links.
- **Store Notes**: saved cards for the selected store, including when the note was added and what date the source card referenced.
- **Restock**: supplier comparison workflow for store supplies.
- **Chatbot**: floating assistant with memory of the active store and current scan.

## Data Sources

Warden uses no-key or optional-key public sources for the demo path:

- Open-Meteo forecast and air quality
- National Weather Service alerts
- OpenStreetMap / Nominatim geocoding and place data
- Google News RSS / GDELT-style local media checks
- Local city and regulatory pages
- DataSF public safety and 311 data where relevant
- USGS earthquake feeds
- NASA EONET natural event feeds

Optional integrations:

- `APIFY_TOKEN` for future Actor-backed extraction
- `SOCRATA_APP_TOKEN` for higher DataSF/Socrata limits
- `WORLD_MONITOR_KEY` for a future monitor hook

## Tech Stack

- Node.js server with native ESM
- Vanilla HTML, CSS, and JavaScript frontend
- Browser `localStorage` for demo persistence
- No required database
- No required paid API key for the base demo

## Project Structure

```text
WARDEN/
  public/
    index.html        # App shell and styles
    app.js            # Frontend state, UI rendering, translation, notes, chat, restock
  scripts/
    smoke-test.mjs    # Local regression smoke test
  docs/               # Supporting notes
  APIFY_RESEARCH.md   # Research notes for future Apify replacement
  server.mjs          # API server, public data adapters, synthesis logic
  package.json
  .env.example
```

## Run Locally

```bash
cd /Users/dhrumilshah/WARDEN
npm run dev
```

Open:

```text
http://127.0.0.1:4173/
```

The default port is `4173`. You can override it with `PORT` in `.env`.

## Environment Variables

Create a local `.env` only when you want optional integrations:

```bash
cp .env.example .env
```

Supported variables:

```text
APIFY_TOKEN=replace_with_event_token
WORLD_MONITOR_KEY=optional_worldmonitor_key
SOCRATA_APP_TOKEN=optional_datasf_socrata_app_token
PORT=4173
```

The app runs without these keys for the base demo.

## Smoke Test

Start the server first:

```bash
npm run dev
```

Then run:

```bash
npm run smoke
```

The smoke test checks:

- health endpoint
- static app shell
- custom restock search links
- priced product rows for a sample supply search
- Santa Clara geocoding from address-only input
- coordinate regression where blank values should not become `0,0`
- San Francisco profile geocoding remains San Francisco

## Important Local APIs

```text
GET /health
GET /api/intel?businessName=...&businessType=...&address=...&city=...&state=...
GET /api/restock?q=spoon&businessType=restaurant&city=Santa%20Clara
GET /api/apify/run?actorId=...&startUrls=https://example.com
```

`/api/intel` is the main city scan endpoint. It returns scores, metrics, warnings, opportunities, signal groups, weather, source links, and synthesized owner actions.

## Demo Notes

- Store profiles and notes are stored locally in the browser for the hack-day demo.
- Evidence links open the original public source or a readable source page.
- The interface intentionally hides source-health internals from owners; owners see evidence links on each card instead.
- News and event content should represent today or future-facing planning. Past-only items are filtered out where article dates are available.
- The current Apify bridge is ready for replacement with simple Actor calls later.

## Product Goal

Warden is not meant to be a generic dashboard. The goal is practical small-business impact: help an owner decide what to do today about weather, safety, permits, competition, local demand, and supplies without opening ten tabs or reading raw API output.
