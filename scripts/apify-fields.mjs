import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = await readFile(path.join(__dirname, "..", ".env"), "utf8");
for (const line of env.split(/\r?\n/)) {
  if (!line.includes("=") || line.startsWith("#")) continue;
  const [k, ...rest] = line.split("=");
  if (!process.env[k]) process.env[k] = rest.join("=").replace(/^["']|["']$/g, "");
}

const endpoint = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;
const input = {
  searchStringsArray: ["restaurants in San Francisco"],
  maxCrawledPlacesPerSearch: 2,
  language: "en",
  skipClosedPlaces: true,
  additionalInfo: true,
  scrapePlaceDetailPage: true
};

console.log("Calling Apify (~30-60s)...");
const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
const items = await r.json();
const first = Array.isArray(items) ? items[0] : null;
if (!first) { console.log("no items"); process.exit(1); }

console.log("Field names available on each place:");
for (const k of Object.keys(first).sort()) {
  const v = first[k];
  const summary = Array.isArray(v) ? `[array len=${v.length}]` : typeof v === "object" && v !== null ? `{obj keys=${Object.keys(v).slice(0,3).join(",")}...}` : String(v).slice(0, 60);
  console.log(`  ${k}: ${summary}`);
}

if (first.popularTimesHistogram) {
  console.log("\nSample popularTimesHistogram structure:");
  const days = Object.keys(first.popularTimesHistogram);
  console.log("  days:", days);
  if (days[0]) console.log("  sample day:", JSON.stringify(first.popularTimesHistogram[days[0]]?.slice?.(0, 4) || first.popularTimesHistogram[days[0]]).slice(0, 200));
}
