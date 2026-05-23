#!/usr/bin/env node
// Preload Apify scans for every supported business type at well-known SF addresses.
// After this finishes, the disk-backed cache (warden/cache/places-cache.json) holds
// fresh results so subsequent dashboard loads are instant — even after a server restart.
//
// Usage:
//   node scripts/preload-sf.mjs
//   WARDEN_BASE_URL=http://127.0.0.1:4173 node scripts/preload-sf.mjs
//
// The dev server must be running.

const BASE = process.env.WARDEN_BASE_URL || "http://127.0.0.1:4173";

const SF_PROFILES = [
  { businessType: "restaurant",   businessName: "Demo SF Restaurant",   address: "412 Mission St, San Francisco, CA",         city: "San Francisco", state: "CA", lat: "37.7909", lon: "-122.3971" },
  { businessType: "coffee shop",  businessName: "Demo SF Coffee Shop",  address: "598 Hayes St, San Francisco, CA",            city: "San Francisco", state: "CA", lat: "37.7762", lon: "-122.4259" },
  { businessType: "food stall",   businessName: "Demo SF Food Stall",   address: "1 Ferry Building, San Francisco, CA",        city: "San Francisco", state: "CA", lat: "37.7956", lon: "-122.3933" },
  { businessType: "grocery",      businessName: "Demo SF Grocery",      address: "475 Stockton St, San Francisco, CA",         city: "San Francisco", state: "CA", lat: "37.7919", lon: "-122.4067" },
  { businessType: "retail",       businessName: "Demo SF Retail",       address: "865 Market St, San Francisco, CA",           city: "San Francisco", state: "CA", lat: "37.7836", lon: "-122.4076" },
  { businessType: "salon",        businessName: "Demo SF Salon",        address: "1810 Polk St, San Francisco, CA",            city: "San Francisco", state: "CA", lat: "37.7912", lon: "-122.4216" },
  { businessType: "barbershop",   businessName: "Demo SF Barbershop",   address: "200 Fillmore St, San Francisco, CA",         city: "San Francisco", state: "CA", lat: "37.7717", lon: "-122.4302" },
  { businessType: "laundromat",   businessName: "Demo SF Laundromat",   address: "390 Valencia St, San Francisco, CA",         city: "San Francisco", state: "CA", lat: "37.7669", lon: "-122.4225" },
  { businessType: "pharmacy",     businessName: "Demo SF Pharmacy",     address: "565 Castro St, San Francisco, CA",           city: "San Francisco", state: "CA", lat: "37.7596", lon: "-122.4350" },
  { businessType: "daycare",      businessName: "Demo SF Daycare",      address: "1450 Sutter St, San Francisco, CA",          city: "San Francisco", state: "CA", lat: "37.7868", lon: "-122.4233" },
  { businessType: "auto repair",  businessName: "Demo SF Auto Repair",  address: "1500 Bryant St, San Francisco, CA",          city: "San Francisco", state: "CA", lat: "37.7691", lon: "-122.4101" },
  { businessType: "liquor store", businessName: "Demo SF Liquor Store", address: "300 Divisadero St, San Francisco, CA",       city: "San Francisco", state: "CA", lat: "37.7741", lon: "-122.4377" }
];

console.log(`Preloading ${SF_PROFILES.length} SF storefront profiles via ${BASE}/api/intel`);
console.log("Each scan: ~10–60 s when cold, instant when already cached on Apify's side.\n");

let warmed = 0;
let failed = 0;
const overallStart = Date.now();

for (const p of SF_PROFILES) {
  const start = Date.now();
  const url = `${BASE}/api/intel?${new URLSearchParams(p)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const places = (data.marketPlaces || []).length;
    const apify = data.marketProvider === "apify";
    const compliance = (data.licenseChecklist || []).length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (apify && places > 0) {
      warmed += 1;
      console.log(`PASS  ${p.businessType.padEnd(14)} ${places} places · ${compliance} compliance docs · ${elapsed}s`);
    } else {
      failed += 1;
      console.log(`WARN  ${p.businessType.padEnd(14)} returned no Apify places (${data.marketProvider}) · ${elapsed}s`);
    }
  } catch (error) {
    failed += 1;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`FAIL  ${p.businessType.padEnd(14)} ${error.message} · ${elapsed}s`);
  }
}

const overallElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
console.log("");
console.log(`Done in ${overallElapsed}s · ${warmed} warmed · ${failed} failed`);
console.log("Disk cache: warden/cache/places-cache.json");
console.log("Stop and restart the server — cached entries will replay on startup.");
