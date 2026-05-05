# Apify Research Brief

Last updated: 2026-05-04

## What Apify Is

Apify is a cloud platform and marketplace for web data extraction, browser automation, and data-powered AI workflows. Its core unit is the Actor: a reusable serverless program that accepts JSON input, runs scraping/automation/data processing logic, and writes structured output.

For the All Things Agents hackathon, think of Apify as the live-web data layer for an AI agent:

- Run an existing Actor from Apify Store.
- Pull its dataset output through the API or SDK.
- Feed the fresh structured data into an LLM, RAG flow, dashboard, alerting tool, or automation.
- Optionally build a custom Actor if the store does not cover the target website or API.

## Core Building Blocks

### Actors

Actors are serverless cloud programs for scraping, automation, and data processing. They take structured JSON input and can produce structured output. Actors can be run manually, through the API, from the CLI, on schedules, or as part of integrations.

Useful facts:

- Actors can be private or public.
- Public Actors can be published to Apify Store.
- Each Actor has metadata, documentation, Docker/runtime setup, input schema, and optional output schema.
- Actors can call other Actors, enabling multi-step data workflows.

Docs:

- https://docs.apify.com/platform/actors
- https://docs.apify.com/platform/actors/running
- https://docs.apify.com/platform/actors/development/actor-definition/input-schema
- https://docs.apify.com/platform/actors/development/actor-definition/output-schema

### Actor Tasks

Tasks are saved reusable configurations for an Actor. For example, one Google Maps Scraper task might collect cafes in San Francisco, while another collects dentists in Austin.

Good hackathon use:

- Preconfigure repeatable demo runs.
- Avoid re-entering long JSON input.
- Schedule or trigger the same configured scrape repeatedly.

Docs:

- https://docs.apify.com/platform/actors/running/tasks

### Datasets

Datasets store the main structured output from Actor runs. They are append-only and optimized for rows/items. Data can be exported as JSON, JSONL, CSV, XML, Excel/XLSX, HTML table, RSS, and more.

Good hackathon use:

- Primary place to read scraped results from an Actor run.
- Feed dataset items into an LLM summarizer, ranker, classifier, or alerting workflow.
- Export results quickly for a demo.

Docs:

- https://docs.apify.com/platform/storage/dataset
- https://docs.apify.com/api/v2/getting-started

### Key-Value Stores

Key-value stores hold arbitrary files or records: JSON, HTML, images, PDFs, screenshots, plain text, zip files, etc. Each Actor run gets a default key-value store.

Good hackathon use:

- Store Actor input, config, screenshots, generated reports, PDFs, or final summaries.
- Keep non-tabular outputs that do not fit a dataset.

Docs:

- https://docs.apify.com/platform/storage/key-value-store

### Request Queues

Request queues manage URLs or requests for crawling. They help avoid duplicates and support large crawl flows.

Good hackathon use:

- Build custom crawlers that discover new URLs.
- Crawl breadth-first or depth-first while preserving state.

Docs:

- https://docs.apify.com/platform/storage/request-queue

### Apify Proxy

Apify Proxy helps avoid blocking by rotating datacenter or residential IPs. Residential proxies support country targeting and sticky sessions.

Good hackathon use:

- Make scrapes more reliable on sites that block bots.
- Use residential proxies when dynamic or protected sites are difficult.

Docs:

- https://docs.apify.com/platform/proxy/datacenter-proxy
- https://docs.apify.com/platform/proxy/residential-proxy

### Schedules

Schedules run Actors or Actor tasks at chosen times using cron expressions. They support timezone settings and can trigger multiple Actors/tasks.

Good hackathon use:

- Price tracker.
- Market/news monitor.
- Daily/weekly lead generation.
- Demo an agent that keeps itself updated.

Docs:

- https://docs.apify.com/platform/schedules

### Webhooks And Integrations

Webhooks trigger POST requests when Actor/system events happen, such as a run succeeding or failing. Integrations connect Apify to Slack, Google Drive, Gmail, GitHub, Airtable, Zapier, Make, n8n, Airbyte, Keboola, vector databases, and LLM frameworks.

Good hackathon use:

- Run scraper -> webhook -> backend endpoint -> LLM summary -> notification.
- Run scraper -> export to Google Sheets or Drive.
- Chain Actors when one run finishes.

Docs:

- https://docs.apify.com/integrations
- https://docs.apify.com/integrations/webhooks
- https://docs.apify.com/platform/integrations/actors
- https://docs.apify.com/platform/integrations/make
- https://docs.apify.com/platform/integrations/zapier

### API

The Apify REST API is the control plane for running Actors, monitoring runs, reading logs, fetching datasets, managing storage, tasks, schedules, and webhooks.

Common pattern:

1. Start an Actor with JSON input.
2. Wait for run completion or poll run status.
3. Read `defaultDatasetId` from the run.
4. Fetch dataset items.
5. Send items to the app or LLM.

Authentication:

- Use `Authorization: Bearer <APIFY_TOKEN>`.
- Do not put tokens into committed code.

Docs:

- https://docs.apify.com/api
- https://docs.apify.com/api/v2/getting-started

### API Clients

Official clients are easier than raw REST and include retries/backoff.

JavaScript/TypeScript:

- Package: `apify-client`
- Works in Node.js, browser, Deno, and Bun.
- Common methods: `client.actor(...).call()`, `client.dataset(...).listItems()`.
- Docs: https://docs.apify.com/api/client/js

Python:

- Package: `apify-client`
- Requires Python 3.11+.
- Sync and async clients.
- Common methods: `client.actor(...).call(...)`, `client.dataset(...).list_items()`.
- Docs: https://docs.apify.com/api/client/python/docs

### SDKs For Building Actors

Use these when we need to build our own Actor instead of calling existing store Actors.

JavaScript/TypeScript:

- Package: `apify`
- Often used with Crawlee, Playwright, Puppeteer, Cheerio, or raw HTTP.
- Docs: https://docs.apify.com/sdk

Python:

- Package: `apify`
- Requires Python 3.10+.
- Provides Actor lifecycle, local storage emulation, events, and storage helpers.
- Docs: https://docs.apify.com/sdk/python

### CLI

The Apify CLI creates, runs, logs in, and deploys Actors from the terminal.

Useful commands:

```bash
npm i -g apify-cli
apify create my-actor
cd my-actor
apify run
apify login
apify push
```

Docs:

- https://docs.apify.com/cli

### MCP Server For Agents

Apify has an MCP server that lets AI apps/agents discover and run Actors, access storage/results, and use Apify docs/tutorials. It supports hosted Streamable HTTP with OAuth and can also run locally for development.

Good hackathon use:

- Let an agent dynamically choose and run Apify Actors as tools.
- Chain live data collection into a conversational research assistant.

Docs:

- https://docs.apify.com/platform/integrations/mcp

## Apify Store

Apify Store is the marketplace of public Actors. Current store pages advertise 27,000+ Actors for scraping and automation.

Major categories visible from the store:

- Social media
- AI
- Agents
- Lead generation
- E-commerce
- SEO tools

High-signal Actors for hackathon prototypes:

- `apify/website-content-crawler`: crawl websites/docs and output AI-ready text/Markdown for RAG.
- `apify/web-scraper`: generic browser-based scraper with custom JavaScript extraction.
- `apify/google-search-scraper`: Google SERP data, AI overviews, organic/paid results.
- `compass/crawler-google-places`: Google Maps places, reviews, contact/business info.
- `apify/e-commerce-scraping-tool`: product/price monitoring across retail sites.
- `apify/instagram-scraper`: Instagram profile/post/hashtag data.
- `clockworks/tiktok-scraper`: TikTok videos, profiles, hashtags, posts.
- `apify/facebook-posts-scraper`: Facebook post and engagement data.
- `streamers/youtube-scraper`: YouTube channel/video metadata.

Docs/store:

- https://apify.com/store
- https://docs.apify.com/platform/console/store
- https://apify.com/apify/website-content-crawler
- https://apify.com/apify/web-scraper

## Hackathon Build Patterns

### AI Research Assistant

Use `website-content-crawler`, Google Search/News-style Actors, or targeted site scrapers. Store pages/articles in datasets, summarize with an LLM, and cite source URLs.

Demo hook:

- "Ask a question, agent finds live web data, extracts sources, gives a cited answer."

### Market Or Social Analytics

Use TikTok, Instagram, YouTube, Facebook, Google Search, or Google Maps Actors. Analyze sentiment, trends, engagement, rankings, competitor movement, or local market opportunities.

Demo hook:

- "Enter a brand/category/city and get a live opportunity report."

### Travel Planner

Use travel/flight/hotel/location Actors plus Google Maps/place data. Combine prices, places, reviews, and constraints into itinerary generation.

Demo hook:

- "Live itinerary based on budget, weather-ish constraints, and current prices."

### Price Tracker And Alerts

Use e-commerce Actors, schedule runs, store snapshots, compare current vs previous prices, send alerts via webhook/email/Slack.

Demo hook:

- "Track this product/category and alert when price drops or stock returns."

### Automation Bot

Use an Actor to collect data, another Actor/webhook to transform or send it, and a backend/LLM layer to decide what to do.

Demo hook:

- "Agent watches a data source and takes a next action automatically."

## Fast Implementation Recipe

1. Choose a Store Actor instead of writing a scraper from scratch.
2. Run it once in Apify Console and inspect the dataset.
3. Save its working input as an Actor task.
4. Use `apify-client` from our app to call the Actor/task.
5. Fetch dataset items.
6. Normalize data into the fields the LLM needs.
7. Prompt the LLM with the fresh data and source URLs.
8. Cache or store results locally for the demo.
9. Add webhook/schedule only if the demo needs automation.

## Token Storage Plan

When the event provides API keys, store the Apify key locally in:

```bash
/Users/dhrumilshah/Warden/.env
```

Use this variable name:

```bash
APIFY_TOKEN=your_token_here
```

Security notes:

- `.env` should not be committed.
- The API token should be read from environment variables by code.
- Prefer `Authorization: Bearer $APIFY_TOKEN` for raw HTTP requests.

## Minimal Code Snippets

### JavaScript Client

```js
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

const run = await client.actor('apify/website-content-crawler').call({
  startUrls: [{ url: 'https://docs.apify.com/' }],
  maxCrawlPages: 10,
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

### Python Client

```python
import os
from apify_client import ApifyClient

client = ApifyClient(token=os.environ["APIFY_TOKEN"])

run = client.actor("apify/website-content-crawler").call(run_input={
    "startUrls": [{"url": "https://docs.apify.com/"}],
    "maxCrawlPages": 10,
})

items = client.dataset(run["defaultDatasetId"]).list_items().items
print(items)
```

## Best Bets For A One-Day Demo

The fastest route is likely:

1. Use an existing Apify Store Actor.
2. Pull dataset output into a small local web app.
3. Add an LLM step for synthesis/ranking/explanation.
4. Show source-backed results and one automation feature.

Most promising idea families:

- Live competitor intelligence.
- Local business lead finder.
- Social trend analyst.
- Product price and stock tracker.
- RAG assistant over a live website/documentation set.
- Event/travel planner with live venue/place data.

