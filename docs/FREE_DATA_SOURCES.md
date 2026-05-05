# Free/Public Data Source Map

Last updated: 2026-05-04

## Already Wired

| Source | Key Required | Current Use |
| --- | --- | --- |
| Open-Meteo Forecast | No | Local temperature, rain probability, wind, 7-day forecast |
| Open-Meteo Air Quality | No for basic/non-commercial use | US AQI and PM2.5 |
| National Weather Service | No | Active alerts for a coordinate |
| DataSF SFPD incidents | No; optional Socrata app token | Recent police reports near SF shop |
| DataSF 311 cases | No; optional Socrata app token | Nearby street, sanitation, graffiti and infrastructure cases |
| GDELT DOC 2.1 | No | Local news search by city and business type |
| USGS Earthquake GeoJSON | No | Recent regional earthquake events |
| NASA EONET | No | Natural events in a regional bounding box |
| WorldMonitor | Trusted origin or optional key | Optional OSINT bootstrap adapter |
| Apify | Yes, event token | Hackathon Actor replacement layer |

## Good Next Additions

| Source | Key Required | Use |
| --- | --- | --- |
| Overpass API | No, rate-limited | Competitors and nearby amenities from OpenStreetMap |
| Yelp Fusion | Yes, free tier | Competitor ratings/reviews once an event key is available |
| Ticketmaster Discovery | Yes, free tier | Nearby concerts/events for foot traffic |
| PredictHQ | Yes, limited/free trial | Event impact scoring |
| Google Places | Yes | Best production option for competitor intelligence |
| BLS public API | No for limited use | Local labor/cost indicators |
| CoinGecko | No | Macro/crypto indicators if useful for market dashboard flavor |
| Yahoo Finance unofficial endpoints | No but unstable | Market backup only; avoid relying on it for judging |

## Apify Swap Plan

The app frontend expects `/api/intel` to return:

- `scores`
- `banners`
- `groups[].signals[]`
- `recommendations`
- `sourceHealth`

That means Apify can replace any individual adapter without changing the UI. Good Actor targets:

- `apify/website-content-crawler` for source-backed research/RAG.
- Google Search/News-style Actors for local news discovery.
- Google Maps/Places Actors for competitor and nearby business data.
- Social media Actors for TikTok/Instagram/Youtube trend signals.
- E-commerce/price Actors for supply and inventory cost monitoring.

