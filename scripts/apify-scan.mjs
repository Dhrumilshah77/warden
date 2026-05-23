#!/usr/bin/env node
// Standalone Apify Google Places test.
// Usage:
//   node scripts/apify-scan.mjs "restaurants in Santa Clara, CA"
//   APIFY_PLACES_ACTOR=compass/crawler-google-places node scripts/apify-scan.mjs "cafes in San Francisco"
//
// Requires APIFY_TOKEN in .env or the environment.
// Defaults: actor=compass/crawler-google-places, max=15.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await loadDotEnv(path.join(__dirname, "..", ".env"));

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) {
  console.error("APIFY_TOKEN is not set. Add it to .env at the repo root, or run:");
  console.error('  $env:APIFY_TOKEN = "<your_apify_token>"   # PowerShell');
  console.error('  export APIFY_TOKEN=<your_apify_token>     # bash');
  process.exit(1);
}

const actorId = process.env.APIFY_PLACES_ACTOR || "compass/crawler-google-places";
const max = Number(process.env.APIFY_MAX_PLACES || 15);
const query = process.argv.slice(2).join(" ").trim() || "restaurants in Santa Clara, CA";

console.log(`Apify actor : ${actorId}`);
console.log(`Search      : ${query}`);
console.log(`Max results : ${max}`);
console.log("Calling run-sync-get-dataset-items (30-90s typical)...\n");

const apiActorId = actorId.replace("/", "~");
const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(apiActorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(TOKEN)}`;
const input = {
  searchStringsArray: [query],
  maxCrawledPlacesPerSearch: max,
  language: "en",
  skipClosedPlaces: true
};

const started = Date.now();
let response;
try {
  response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
} catch (error) {
  console.error(`Network error: ${error.message}`);
  process.exit(1);
}

if (!response.ok) {
  const text = await response.text().catch(() => "");
  console.error(`HTTP ${response.status} from Apify: ${text.slice(0, 500)}`);
  process.exit(1);
}

const items = await response.json();
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(`Got ${Array.isArray(items) ? items.length : 0} places in ${elapsed}s\n`);

const list = Array.isArray(items) ? items.slice(0, 10) : [];
for (const place of list) {
  const name = place.title || place.name || "(unknown)";
  const cat = place.categoryName || place.category || "";
  const rating = place.totalScore ? `${place.totalScore} stars (${place.reviewsCount || 0} reviews)` : "no rating";
  const url = place.url || place.googleUrl || "";
  const addr = place.address || "";
  console.log(`- ${name}`);
  if (cat) console.log(`    ${cat}  |  ${rating}`);
  if (addr) console.log(`    ${addr}`);
  if (url) console.log(`    ${url}`);
  console.log();
}

if (!list.length) {
  console.log("No items returned. Possible causes: free-tier limits, actor input mismatch, or location not understood.");
  console.log("Try a different query or set APIFY_PLACES_ACTOR to another Maps actor.");
}

async function loadDotEnv(envPath) {
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env is optional
  }
}
