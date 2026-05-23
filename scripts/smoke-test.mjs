const BASE = process.env.WARDEN_BASE_URL || "http://127.0.0.1:4173";

const checks = [];

await check("health endpoint", async () => {
  const data = await json("/api/health");
  assert(data.ok === true, "health did not return ok=true");
});

await check("static app shell", async () => {
  const response = await fetch(`${BASE}/`);
  assert(response.status === 200, `expected 200, got ${response.status}`);
  const html = await response.text();
  assert(html.includes("Warden - Storefront intelligence"), "app shell did not load expected title text");
  assert(html.includes("id=\"storeNotesBtn\""), "store-specific notes button should be present");
  assert(html.includes("id=\"storeInfoSection\""), "right-side store info view should be present");
  assert(!html.includes("id=\"removeStoreBtn\""), "visible store remove button should not be present");
  assert(html.includes("id=\"chatFab\""), "floating chatbot button should be present");
  assert(html.includes("Warden Helper"), "chatbot popup should be present");
  assert(html.includes("id=\"agentSection\""), "delegated agent console should be present");
  assert(html.includes("id=\"agentUserSelect\""), "delegated user selector should be present");
  assert(html.includes("id=\"agentAutopilotPanel\""), "peak day autopilot panel should be present");
  assert(html.includes("id=\"agentCustomerPanel\""), "customer recovery agent panel should be present");
  assert(html.includes("id=\"agentInboxPanel\""), "delegation inbox should be present");
  assert(!html.includes("Review Later"), "app shell should use Notes, not Review Later");
  const appJs = await (await fetch(`${BASE}/app.js`)).text();
  assert(appJs.includes("Add to notes"), "card save buttons should say Add to notes");
  assert(appJs.includes("openStoreInfoView"), "View stored info should open the right-side store info view");
  assert(appJs.includes("executeAgentAction"), "delegated agent actions should be executable from the UI");
  assert(appJs.includes("runPeakDayAutopilot"), "peak day autopilot should be wired in the UI");
  assert(appJs.includes("Customer Recovery Agent"), "customer recovery agent should be rendered in the UI");
  assert(appJs.includes("messageManagerForAction"), "blocked users should be able to message a manager");
  assert(!appJs.includes("removeStoreBtn"), "app JS should not wire a visible remove store button");
  assert(appJs.includes("buildChatReply"), "chatbot should have store-aware reply logic");
  assert(appJs.includes("warden:chatThreads"), "chatbot should persist per-store memory");
  assert(!/Review Later|Review later|review later/.test(appJs), "app JS should not expose Review Later wording");
});

await check("delegated action policy changes by user", async () => {
  const store = {
    businessName: "Mission Demo",
    businessType: "restaurant",
    address: "412 Mission St",
    city: "San Francisco",
    state: "CA"
  };
  const intelPayload = {
    marketProvider: "apify",
    marketPlaces: [{ name: "Nearby Restaurant" }],
    marketIntelligence: { competitorsAnalyzed: 12, busyHeatmap: { peakDay: "Sat", peakHour: 19 }, topReviewTags: [{ title: "clam chowder" }] },
    opportunities: [{ title: "Block peaks Sat 7pm", action: "Staff up" }],
    warnings: [],
    licenseChecklist: [{ name: "Retail food facility health permit", priority: "required", authority: "SFDPH", url: "https://www.sf.gov/" }]
  };
  const owner = await postJson("/api/agent/actions", {
    userId: "owner-ava",
    store,
    intel: intelPayload
  });
  const associate = await postJson("/api/agent/actions", {
    userId: "associate-mia",
    store,
    intel: intelPayload
  });
  assert(owner.actions.some((action) => action.policy.decision === "allowed"), "owner should have at least one allowed delegated action");
  assert(associate.actions.some((action) => action.policy.decision === "blocked"), "associate should be blocked from privileged delegated actions");
  assert(owner.actions.some((action) => action.category === "customer-recovery"), "customer recovery actions should be included");
  assert(owner.integrations.scalekit && owner.integrations.entire && owner.integrations.apify, "agent response should expose sponsor integration status");

  const manager = await postJson("/api/agent/actions", { userId: "manager-ben", store, intel: intelPayload });
  const creditAction = manager.actions.find((action) => action.id === "issue-recovery-credit");
  assert(creditAction?.policy?.decision === "needs_approval", "manager should need owner approval for recovery credits");
  const approvalRequest = await postJson("/api/agent/execute", { userId: "manager-ben", store, intel: intelPayload, action: creditAction });
  assert(approvalRequest.executed === false, "manager recovery credit should not execute without owner approval");
  assert(approvalRequest.inboxItem?.toRole === "owner", "approval request should route to owner inbox");
  const ownerInbox = await json(`/api/agent/inbox?${new URLSearchParams({ userId: "owner-ava" })}`);
  assert(ownerInbox.inbox.some((item) => item.id === approvalRequest.inboxItem.id && item.status === "pending"), "owner inbox should show manager approval request");
  const approval = await postJson("/api/agent/approve", { userId: "owner-ava", requestId: approvalRequest.inboxItem.id });
  assert(approval.executed === true, "owner approval should execute the pending request");

  const blockedAction = associate.actions.find((action) => action.policy.decision === "blocked");
  const message = await postJson("/api/agent/message", { userId: "associate-mia", store, intel: intelPayload, action: blockedAction, toRole: "manager" });
  assert(message.item?.toRole === "manager", "associate escalation should route to manager");
  const managerInbox = await json(`/api/agent/inbox?${new URLSearchParams({ userId: "manager-ben" })}`);
  assert(managerInbox.inbox.some((item) => item.id === message.item.id), "manager inbox should show associate message");
});

await check("custom restock search uses exact supplier links", async () => {
  const data = await json(`/api/restock?${new URLSearchParams({
    businessName: "Campus Burrito Cart",
    businessType: "restaurant",
    address: "Santa Clara University campus food stall",
    city: "Santa Clara",
    state: "CA",
    q: "round patio tables"
  })}`);
  assert(data.mode === "custom-supplier-search", `expected custom-supplier-search, got ${data.mode}`);
  assert(data.category === "custom", `expected custom category, got ${data.category}`);
  assert(Array.isArray(data.options) && data.options.length === 5, "custom restock should return 5 supplier rows");
  assert(data.options.every((item) => /round patio tables/i.test(item.title)), "custom rows should preserve exact search text");
  assert(data.options.some((item) => item.url === "https://www.amazon.com/s?k=round+patio+tables"), "Amazon custom search URL should be exact");
  assert(data.options.some((item) => item.url === "https://www.walmart.com/search?q=round+patio+tables"), "Walmart custom search URL should be exact");
  assert(!data.options.some((item) => /chair|container|receipt paper/i.test(`${item.title} ${item.url}`)), "custom search should not fall back to preset category products");
});

await check("spoon restock returns priced product rows", async () => {
  const data = await json(`/api/restock?${new URLSearchParams({
    businessName: "Campus Burrito Cart",
    businessType: "restaurant",
    address: "Santa Clara University campus food stall",
    city: "Santa Clara",
    state: "CA",
    q: "spoon"
  })}`);
  assert(data.category === "utensils", `expected utensils category, got ${data.category}`);
  assert(Array.isArray(data.options) && data.options.length === 5, "spoon search should return 5 product rows");
  assert(data.options.every((item) => item.price && item.price !== "Live price"), "spoon rows should show prices on dashboard");
  assert(data.options.every((item) => !/^Search /.test(item.title || "")), "spoon rows should show products, not empty search rows");
  assert(data.options.some((item) => /spoon|cutlery/i.test(item.title || "")), "spoon rows should include spoon/cutlery products");
});

await check("specific restock searches avoid random photo fallbacks", async () => {
  const data = await json(`/api/restock?${new URLSearchParams({
    businessName: "Mission Lounge",
    businessType: "retail",
    address: "412 Mission St",
    city: "San Francisco",
    state: "CA",
    q: "recliner chair"
  })}`);
  assert(data.mode === "custom-supplier-search", `expected custom-supplier-search, got ${data.mode}`);
  assert(data.category === "custom", `expected custom category, got ${data.category}`);
  assert(data.options.every((item) => /recliner chair/i.test(item.title || "")), "recliner rows should preserve exact search text");
  assert(!data.options.some((item) => /loremflickr|source\.unsplash/i.test(item.image || "")), "restock rows should not use unreliable random image services");
  assert(data.options.every((item) => ["generated", "supplier", "apify", "commons", "preloaded"].includes(item.imageSource)), "restock image source should be traceable");
});

await check("generic restock searches use preloaded product images", async () => {
  for (const q of ["chair", "table", "utensils", "jack", "car parts", "oil", "shoes"]) {
    const data = await json(`/api/restock?${new URLSearchParams({
      businessName: "Mission Demo",
      businessType: q === "jack" || q === "car parts" || q === "oil" ? "auto repair" : "retail",
      address: "412 Mission St",
      city: "San Francisco",
      state: "CA",
      q
    })}`);
    assert(Array.isArray(data.options) && data.options.length > 0, `${q} should return restock rows`);
    assert(data.options.some((item) => item.imageSource === "preloaded" || item.imageSource === "apify"), `${q} should use preloaded or live product images`);
    assert(!data.options.some((item) => /loremflickr|source\.unsplash/i.test(item.image || "")), `${q} should not use unreliable random image services`);
  }
});

await check("Santa Clara geocodes from address only", async () => {
  const data = await intel({
    businessName: "SCU Campus Food Stall",
    businessType: "food stall",
    address: "Santa Clara University campus food stall",
    state: "CA",
    radiusMeters: "1600"
  });
  assert(data.profile.city === "Santa Clara", `expected Santa Clara, got ${data.profile.city}`);
  assert(data.profile.lat > 37.30 && data.profile.lat < 37.39, `unexpected lat ${data.profile.lat}`);
  assert(data.profile.lon < -121.88 && data.profile.lon > -122.0, `unexpected lon ${data.profile.lon}`);
  assert(data.sourceHealth.find((item) => item.key === "police")?.message.includes("San Francisco locations"), "SFPD adapter should not run for Santa Clara");
  assert(data.sourceHealth.find((item) => item.key === "cases311")?.message.includes("San Francisco locations"), "SF311 adapter should not run for Santa Clara");
  assert(data.sourceHealth.find((item) => item.key === "news")?.message.includes("Santa Clara"), "news should be localized to Santa Clara");
  assert(Array.isArray(data.licenseChecklist) && data.licenseChecklist.length > 0, "license checklist should be present");
  assert(Array.isArray(data.opportunities) && data.opportunities.length > 0, "opportunities should be present");
  assert(!data.opportunities.some((item) => /overpass-api\.de\/api\/interpreter|api\.gdeltproject\.org\/api\/v2\/doc\/doc/.test(item.url || "")), "opportunities should link to readable evidence, not raw API endpoints");
  assertOwnerLanguage(data.opportunities, ["title", "why", "action", "impact"], "opportunities");
  assert(Array.isArray(data.warnings) && data.warnings.length > 0, "warnings should be present");
  assertOwnerLanguage(data.warnings, ["title", "why", "action", "urgency"], "warnings");
  assertActionableCards(data);
  assert(Array.isArray(data.weatherForecast) && data.weatherForecast.length === 7, "weekly weather forecast should be present");
  assert(Array.isArray(data.metrics) && data.metrics.some((item) => item.label === "Monitoring Area"), "semantic metrics should be present");
  assert(data.profile.cityScopeLabel?.includes("Santa Clara"), "monitoring scope should be city-wide Santa Clara");
  assert(data.profile.radiusMeters > 3000, "city radius should be computed from the city, not the tiny user radius");
  assert(data.groups.some((group) => group.label === "Compliance and Licensing"), "compliance group should be present");
  assert(data.groups.some((group) => group.label === "Crime and Safety"), "Santa Clara safety scan should be present");
  assert(data.groups.some((group) => group.label === "Infrastructure"), "Santa Clara infrastructure scan should be present");
  assert(data.groups.some((group) => group.label === "Market and Competition"), "Santa Clara market scan should be present");
  const mediaGroup = data.groups.find((group) => group.label === "Media and Market");
  assert(mediaGroup?.signals?.some((signal) =>
    signal.code === "TRD" &&
    /^City trend:/i.test(signal.headline || "") &&
    /Profit angle/i.test(signal.body || "") &&
    /restaurant/i.test(signal.body || "") &&
    signal.action &&
    Array.isArray(signal.pointers) &&
    signal.pointers.length >= 3
  ), "Media and Market should turn city trends into restaurant-specific profit plays");
  assert(!data.sourceHealth.find((item) => item.key === "marketScan")?.url.includes("overpass-api.de/api/interpreter"), "market scan source health should use a readable map URL");
  assert(!data.sourceHealth.some((item) => item.key === "worldMonitor"), "WorldMonitor should not appear in owner-facing health checks");
});

await check("zero coordinate inputs do not override address geocoding", async () => {
  const data = await intel({
    businessName: "SCU Campus Food Stall",
    businessType: "restaurant",
    address: "Santa Clara University campus food stall",
    state: "CA",
    lat: "0",
    lon: "0",
    radiusMeters: "1600"
  });
  assert(data.profile.city === "Santa Clara", `0,0 regression: expected Santa Clara, got ${data.profile.city}`);
  assert(Math.abs(data.profile.lat) > 1 && Math.abs(data.profile.lon) > 1, "0,0 coordinates leaked through");
});

await check("San Francisco profile remains San Francisco", async () => {
  const data = await intel({
    businessName: "Dhrumil's SF Shop",
    businessType: "restaurant",
    address: "412 Mission St, San Francisco, CA",
    city: "San Francisco",
    state: "CA",
    lat: "37.7909",
    lon: "-122.3971",
    radiusMeters: "1200"
  });
  assert(data.profile.city === "San Francisco", `expected San Francisco, got ${data.profile.city}`);
  assert(data.sourceHealth.find((item) => item.key === "police")?.ok === true, "SFPD adapter should be healthy for SF");
  assert(data.sourceHealth.find((item) => item.key === "cases311")?.ok === true, "SF311 adapter should be healthy for SF");
  assert(!data.groups.some((group) => group.label === "Hackathon Hooks"), "hackathon hooks should not be visible");
});

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.ok ? "" : ` - ${item.error}`}`);
}

if (failed.length) process.exit(1);

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
  }
}

async function intel(params) {
  return json(`/api/intel?${new URLSearchParams(params)}`);
}

async function json(path) {
  const response = await fetch(`${BASE}${path}`);
  const text = await response.text();
  assert(response.ok, `HTTP ${response.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

async function postJson(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  assert(response.ok, `HTTP ${response.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertOwnerLanguage(items, keys, label) {
  const technical = /\b(OpenStreetMap|GDELT|API|feed|sampled|public-map|source lead|raw|endpoint)\b/i;
  for (const item of items) {
    const text = keys.map((key) => item[key] || "").join(" ");
    assert(!technical.test(text), `${label} contain technical wording: ${text}`);
  }
}

function assertActionableCards(data) {
  const badWarnings = (data.warnings || []).filter((item) =>
    /^Review:/i.test(item.title || "") ||
    String(item.title || "").length > 96 ||
    /\.\.\.$/.test(item.title || "") ||
    (item.pointers || []).some((pointer) => /^Open source$/i.test(pointer))
  );
  assert(!badWarnings.length, `warnings should be owner-ready, got: ${badWarnings.map((item) => item.title).join(" | ")}`);

  const articleSignals = (data.groups || []).flatMap((group) => group.signals || []).filter((item) => item.evidenceTitle);
  const badSignals = articleSignals.filter((item) =>
    item.headline === item.evidenceTitle ||
    String(item.headline || "").length > 96 ||
    /\.\.\.$/.test(item.headline || "") ||
    !item.action ||
    !Array.isArray(item.pointers) ||
    !item.pointers.length
  );
  assert(!badSignals.length, `article signals should summarize business meaning first, got: ${badSignals.map((item) => item.headline).join(" | ")}`);
}
