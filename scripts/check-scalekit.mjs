import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await loadDotEnv();

const targets = [
  { label: "Apify", aliases: ["apify", "apify-mcp"] },
  { label: "Zoom", aliases: ["zoom"] },
  { label: "Google Calendar", aliases: ["google-calendar", "google_calendar", "calendar"] },
  { label: "Gmail", aliases: ["gmail", "google-mail", "google_mail"] }
];

const envUrl = normalizeEnvUrl(process.env.SCALEKIT_ENVIRONMENT_URL || "");
const clientId = process.env.SCALEKIT_CLIENT_ID || "";
const clientSecret = process.env.SCALEKIT_CLIENT_SECRET || "";

if (!envUrl || !clientId || !clientSecret) {
  console.log(JSON.stringify({
    ok: false,
    error: "Missing Scalekit environment variables",
    required: ["SCALEKIT_ENVIRONMENT_URL", "SCALEKIT_CLIENT_ID", "SCALEKIT_CLIENT_SECRET"],
    present: {
      SCALEKIT_ENVIRONMENT_URL: Boolean(envUrl),
      SCALEKIT_CLIENT_ID: Boolean(clientId),
      SCALEKIT_CLIENT_SECRET: Boolean(clientSecret)
    },
    next: "Add the missing values to local .env, then run npm run check:scalekit."
  }, null, 2));
  process.exit(1);
}

try {
  const token = await getAccessToken();
  const [connectionsPayload, accountsPayload] = await Promise.all([
    scalekitGet("/api/v1/connections?include=all", token),
    scalekitGet("/api/v1/connected_accounts?page_size=30", token)
  ]);
  const connections = extractList(connectionsPayload);
  const accounts = extractList(accountsPayload);
  const checks = targets.map((target) => connectorCheck(target, connections, accounts));
  console.log(JSON.stringify({
    ok: true,
    environment: envUrl.replace(/^https?:\/\//, ""),
    connectionsSeen: connections.length,
    connectedAccountsSeen: accounts.length,
    checks
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    error: error.message,
    next: "Verify SCALEKIT_ENVIRONMENT_URL is the full development URL from Dashboard > Developers > Settings, then retry."
  }, null, 2));
  process.exit(1);
}

async function loadDotEnv() {
  try {
    const raw = await readFile(path.join(root, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env is optional.
  }
}

function normalizeEnvUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function getAccessToken() {
  const response = await fetch(`${envUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`Token request failed with ${response.status}: ${data.error || data.error_description || "no access token"}`);
  }
  return data.access_token;
}

async function scalekitGet(route, token) {
  const response = await fetch(`${envUrl}${route}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${route} failed with ${response.status}: ${data.error || data.message || "request failed"}`);
  }
  return data;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["connections", "connected_accounts", "connectedAccounts", "items", "data", "results"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function connectorCheck(target, connections, accounts) {
  const connectionMatches = connections.filter((item) => matchesTarget(item, target.aliases));
  const accountMatches = accounts.filter((item) => matchesTarget(item, target.aliases));
  return {
    connector: target.label,
    connectionConfigured: connectionMatches.length > 0,
    connectionStatuses: unique(connectionMatches.map(statusOf).filter(Boolean)),
    connectedAccounts: accountMatches.length,
    activeConnectedAccounts: accountMatches.filter((item) => /active/i.test(statusOf(item))).length,
    workingForToolCalls: connectionMatches.length > 0 && accountMatches.some((item) => /active/i.test(statusOf(item)))
  };
}

function matchesTarget(item, aliases) {
  const haystack = [
    item?.name,
    item?.connection_name,
    item?.connectionName,
    item?.provider,
    item?.provider_name,
    item?.providerName,
    item?.connector,
    item?.connector_name,
    item?.connectorName,
    item?.identifier,
    item?.id
  ].filter(Boolean).join(" ").toLowerCase();
  return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
}

function statusOf(item) {
  return String(item?.status || item?.connection_status || item?.connector_status || item?.state || "").replace(/^CONNECTOR_STATUS_/, "");
}

function unique(values) {
  return [...new Set(values)];
}
