import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await loadDotEnv();

const envUrl = normalizeEnvUrl(process.env.SCALEKIT_ENVIRONMENT_URL || "");
const clientId = process.env.SCALEKIT_CLIENT_ID || "";
const clientSecret = process.env.SCALEKIT_CLIENT_SECRET || "";
const ownerEmail = process.env.SCALEKIT_DEMO_OWNER_EMAIL || process.env.DEMO_OWNER_EMAIL || "dhrumildeepakshah@gmail.com";
const secondEmail = process.env.SCALEKIT_DEMO_SECOND_EMAIL || process.env.DEMO_CUSTOMER_EMAIL || process.env.WARDEN_GMAIL_DEMO_TO || "dhrumil789789@gmail.com";
const sendInvitationEmail = process.env.SCALEKIT_SEND_INVITES === "1";

const permissions = [
  ["store:intel_read", "View store intelligence, market signals, and reports."],
  ["store:settings_write", "Update store profile, operating hours, and public business settings."],
  ["agent:action_execute", "Allow the agent to execute reversible internal business actions."],
  ["agent:action_approve", "Approve money-moving, public, or customer-facing agent actions."],
  ["agent:action_request", "Ask a manager or owner to run a restricted agent action."],
  ["marketing:campaign_draft", "Create draft promotions and customer messages."],
  ["marketing:campaign_publish", "Publish promotions to customers or public channels."],
  ["customer:segment_write", "Create and update customer recovery or loyalty segments."],
  ["customer:message_send", "Send customer email from the connected owner account."],
  ["supplier:order_draft", "Create supplier order drafts without placing purchases."],
  ["supplier:order_purchase", "Approve supplier purchases or credits."],
  ["team:task_assign", "Assign internal checklists and teammate tasks."],
  ["team:message_create", "Send internal teammate escalation messages."],
  ["store:notes_write", "Create private notes on store reports and alerts."],
  ["audit:trail_read", "Read the store report trail and delegated action history."]
].map(([name, description]) => ({ name, description }));

const roles = [
  {
    name: "owner",
    display_name: "Owner",
    description: "Full store control: approvals, customer sends, purchases, settings, and audit trail.",
    permissions: permissions.map((permission) => permission.name)
  },
  {
    name: "manager",
    display_name: "Manager",
    description: "Runs prep, drafts campaigns, assigns tasks, and prepares supplier orders without owner-only sends or purchases.",
    permissions: [
      "store:intel_read",
      "agent:action_execute",
      "marketing:campaign_draft",
      "customer:segment_write",
      "supplier:order_draft",
      "team:task_assign",
      "team:message_create",
      "audit:trail_read"
    ]
  },
  {
    name: "associate",
    display_name: "Associate",
    description: "Front-line role that can view store intelligence, add notes, and request restricted actions.",
    permissions: [
      "store:intel_read",
      "agent:action_request",
      "store:notes_write",
      "team:message_create"
    ]
  }
];

const organizations = [
  {
    display_name: process.env.SCALEKIT_STORE_1_NAME || "Store 1 - Mission Street",
    external_id: process.env.SCALEKIT_STORE_1_EXTERNAL_ID || "righthand-store-1",
    metadata: {
      app: "righthand-ai",
      demo_store: "1",
      address: "412 Mission St, San Francisco, CA",
      business_type: "restaurant"
    }
  },
  {
    display_name: process.env.SCALEKIT_STORE_2_NAME || "Store 2 - Weekend Pop-up",
    external_id: process.env.SCALEKIT_STORE_2_EXTERNAL_ID || "righthand-store-2",
    metadata: {
      app: "righthand-ai",
      demo_store: "2",
      address: "San Francisco, CA",
      business_type: "retail_pop_up"
    }
  }
];

if (!envUrl || !clientId || !clientSecret) {
  console.log(JSON.stringify({
    ok: false,
    error: "Missing Scalekit environment variables",
    required: ["SCALEKIT_ENVIRONMENT_URL", "SCALEKIT_CLIENT_ID", "SCALEKIT_CLIENT_SECRET"],
    next: "Fill .env, then run npm run sync:scalekit-saas."
  }, null, 2));
  process.exit(1);
}

try {
  const token = await getAccessToken();
  const permissionResults = [];
  const roleResults = [];
  const organizationResults = [];
  const memberResults = [];

  for (const permission of permissions) {
    permissionResults.push(await ensurePermission(permission, token));
  }

  for (const role of roles) {
    roleResults.push(await ensureRole(role, token));
  }

  for (const organization of organizations) {
    const orgResult = await ensureOrganization(organization, token);
    organizationResults.push(orgResult);
    memberResults.push(await ensureOrganizationUser({
      organization: orgResult.organization,
      email: ownerEmail,
      externalId: `${organization.external_id}:owner`,
      role: "owner",
      profile: { first_name: "Dhrumil", last_name: "Shah" }
    }, token));
    memberResults.push(await ensureOrganizationUser({
      organization: orgResult.organization,
      email: secondEmail,
      externalId: `${organization.external_id}:demo-user`,
      role: organization.external_id.endsWith("-2") ? "associate" : "manager",
      profile: { first_name: "Demo", last_name: "User" }
    }, token));
  }

  console.log(JSON.stringify({
    ok: true,
    environment: envUrl.replace(/^https?:\/\//, ""),
    invitations: sendInvitationEmail ? "sent" : "not sent",
    permissions: summarize(permissionResults, "permission"),
    roles: summarize(roleResults, "role"),
    organizations: organizationResults.map(({ action, organization }) => ({
      action,
      id: organization.id,
      display_name: organization.display_name || organization.displayName || organization.name,
      external_id: organization.external_id || organization.externalId
    })),
    memberships: memberResults.map(({ action, email, role, organization }) => ({
      action,
      email,
      role,
      organization: organization.display_name || organization.displayName || organization.name,
      roleVerified: action.includes("role_verified"),
      assignedRoles: action.includes("role_verified") ? [role] : []
    }))
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    error: error.message,
    next: "Open Scalekit Dashboard > Organizations and Roles & Permissions to confirm the API permission for this client, then rerun npm run sync:scalekit-saas."
  }, null, 2));
  process.exit(1);
}

async function ensurePermission(permission, token) {
  const permissionName = scalekitPathKey(permission.name);
  const existing = await scalekitRequest(`/api/v1/permissions/${permissionName}`, { token, allowedStatuses: [404] });
  if (existing.status === 404) {
    const created = await scalekitRequest("/api/v1/permissions", {
      token,
      method: "POST",
      body: permission,
      fallbackBodies: [{ permission }]
    });
    return { action: "created", permission: unwrap("permission", created.data) || permission };
  }
  return { action: "exists", permission: unwrap("permission", existing.data) || permission };
}

async function ensureRole(role, token) {
  const roleName = scalekitPathKey(role.name);
  const existing = await scalekitRequest(`/api/v1/roles/${roleName}`, { token, allowedStatuses: [404] });
  if (existing.status === 404) {
    const created = await scalekitRequest("/api/v1/roles", {
      token,
      method: "POST",
      body: role,
      fallbackBodies: [{ role }]
    });
    return { action: "created", role: unwrap("role", created.data) || role };
  }
  return { action: "exists", role: unwrap("role", existing.data) || role };
}

async function ensureOrganization(organization, token) {
  const existing = await scalekitRequest(`/api/v1/organizations:external/${encodeURIComponent(organization.external_id)}`, { token, allowedStatuses: [404] });
  if (existing.status !== 404) {
    const current = unwrap("organization", existing.data) || existing.data;
    const id = current.id;
    if (!id) throw new Error(`Scalekit returned organization without id for ${organization.external_id}`);
    const updated = await scalekitRequest(`/api/v1/organizations/${encodeURIComponent(id)}`, {
      token,
      method: "PATCH",
      body: organization,
      fallbackBodies: [{ organization }]
    });
    return { action: "updated", organization: unwrap("organization", updated.data) || { ...current, ...organization } };
  }
  const created = await scalekitRequest("/api/v1/organizations", {
    token,
    method: "POST",
    body: organization,
    fallbackBodies: [{ organization }]
  });
  return { action: "created", organization: unwrap("organization", created.data) || created.data };
}

async function ensureOrganizationUser({ organization, email, externalId, role, profile }, token) {
  const orgId = organization.id;
  if (!orgId) throw new Error(`Missing organization id for ${organization.display_name || organization.name}`);
  const currentOrgUsers = await searchOrganizationUsers(orgId, email, token);
  const existingMember = currentOrgUsers.find((user) => sameEmail(user, email));
  if (existingMember?.id) {
    await updateMembership({ orgId, userId: existingMember.id, email, role }, token);
    return { action: await verifiedAction("updated", orgId, email, role, token), email, role, organization };
  }

  const currentUsers = await searchUsers(email, token);
  const existingUser = currentUsers.find((user) => sameEmail(user, email));
  if (existingUser?.id) {
    await addMembership({ orgId, userId: existingUser.id, email, role }, token);
    return { action: await verifiedAction("added", orgId, email, role, token), email, role, organization };
  }

  const createBody = {
    email,
    external_id: externalId,
    send_invitation_email: sendInvitationEmail,
    membership: {
      roles: [role],
      metadata: {
        demo_role: role,
        source: "righthand-ai-hackathon"
      }
    },
    user_profile: {
      ...profile,
      locale: "en-US"
    }
  };
  await scalekitRequest(`/api/v1/organizations/${encodeURIComponent(orgId)}/users`, {
    token,
    method: "POST",
    body: createBody,
    fallbackBodies: [
      {
        ...createBody,
        membership: membershipWithRoleObjects(role)
      },
      {
        ...createBody,
        membership: membershipWithRoleNames(role, "role_name")
      },
      {
        email,
        externalId,
        sendInvitationEmail,
        membership: membershipWithRoleObjects(role),
        userProfile: {
          firstName: profile.first_name,
          lastName: profile.last_name,
          locale: "en-US"
        }
      },
      {
        email,
        external_id: externalId,
        send_invitation_email: sendInvitationEmail,
        user_profile: createBody.user_profile,
        metadata: {
          demo_role_requested: role,
          source: "righthand-ai-hackathon"
        }
      }
    ]
  });
  return { action: await verifiedAction("created", orgId, email, role, token), email, role, organization };
}

async function verifiedAction(baseAction, orgId, email, role, token) {
  const verified = await isRoleVerified(orgId, email, role, token);
  return `${baseAction}_${verified ? "role_verified" : "role_unverified"}`;
}

async function isRoleVerified(orgId, email, role, token) {
  const users = await searchOrganizationUsers(orgId, email, token);
  const user = users.find((item) => sameEmail(item, email));
  const roleNames = userRoleNames(user);
  if (roleNames.includes(role.toLowerCase())) return true;
  if (user?.id) {
    const response = await scalekitRequest(`/api/v1/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(user.id)}/roles`, { token, allowedStatuses: [404] });
    const rolesFromEndpoint = response.status === 404 ? [] : extractList(response.data).map(roleNameOf).filter(Boolean);
    if (rolesFromEndpoint.includes(role.toLowerCase())) return true;
  }
  return false;
}

async function updateMembership({ orgId, userId, email, role }, token) {
  const route = `/api/v1/memberships/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}`;
  for (const body of membershipRequestBodies(role)) {
    try {
      await scalekitRequest(route, { token, method: "PATCH", body });
      if (await isRoleVerified(orgId, email, role, token)) return true;
    } catch {
      // Try the next Scalekit membership payload shape.
    }
  }
  return false;
}

async function addMembership({ orgId, userId, email, role }, token) {
  const route = `/api/v1/memberships/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}`;
  let added = false;
  for (const body of membershipRequestBodies(role)) {
    try {
      await scalekitRequest(route, { token, method: added ? "PATCH" : "POST", body, allowedStatuses: [409] });
      added = true;
      if (await isRoleVerified(orgId, email, role, token)) return true;
    } catch {
      // Try the next Scalekit membership payload shape.
    }
  }
  return false;
}

async function searchOrganizationUsers(orgId, query, token) {
  const url = `/api/v1/organizations/${encodeURIComponent(orgId)}/users:search?${new URLSearchParams({ query, page_size: "10" })}`;
  const response = await scalekitRequest(url, { token, allowedStatuses: [404] });
  if (response.status === 404) return [];
  return extractList(response.data);
}

async function searchUsers(query, token) {
  const response = await scalekitRequest(`/api/v1/users:search?${new URLSearchParams({ query, page_size: "10" })}`, { token, allowedStatuses: [404] });
  if (response.status === 404) return [];
  return extractList(response.data);
}

async function scalekitRequest(route, { token, method = "GET", body, fallbackBodies = [], allowedStatuses = [] } = {}) {
  const bodies = method === "GET" || method === "DELETE" ? [undefined] : [body, ...fallbackBodies];
  let lastError = null;
  for (const candidateBody of bodies) {
    const response = await fetch(`${envUrl}${route}`, {
      method,
      headers: {
        accept: "application/json",
        ...(candidateBody ? { "content-type": "application/json" } : {}),
        authorization: `Bearer ${token}`
      },
      ...(candidateBody ? { body: JSON.stringify(candidateBody) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok || allowedStatuses.includes(response.status)) {
      return { status: response.status, data };
    }
    lastError = new Error(`${method} ${route} failed with ${response.status}: ${apiErrorMessage(data)}`);
    if (![400, 404, 409, 422].includes(response.status)) break;
  }
  throw lastError;
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
    throw new Error(`Token request failed with ${response.status}: ${apiErrorMessage(data)}`);
  }
  return data.access_token;
}

function unwrap(key, payload) {
  if (!payload || typeof payload !== "object") return null;
  return payload[key] || payload[camel(key)] || payload.data?.[key] || payload.data?.[camel(key)] || null;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["users", "organizations", "roles", "user_roles", "userRoles", "role_assignments", "roleAssignments", "permissions", "items", "data", "results"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function sameEmail(user, email) {
  const values = [
    user?.email,
    user?.primary_email,
    user?.primaryEmail,
    user?.user_profile?.email,
    user?.userProfile?.email
  ].filter(Boolean).map((value) => String(value).toLowerCase());
  return values.includes(String(email).toLowerCase());
}

function userRoleNames(user) {
  const roles = user?.membership?.roles || user?.memberships?.flatMap((membership) => membership.roles || []) || user?.roles || [];
  return roles.map(roleNameOf).filter(Boolean);
}

function roleNameOf(role) {
  if (typeof role === "string") return role.toLowerCase();
  return String(role?.name || role?.role_name || role?.roleName || role?.role?.name || role?.role?.role_name || "").toLowerCase();
}

function summarize(results, key) {
  return results.map((result) => ({
    action: result.action,
    name: result[key]?.name || result[key]?.display_name || result[key]?.displayName
  }));
}

function membershipWithRoleObjects(role) {
  return {
    roles: [{ name: role }],
    metadata: {
      demo_role: role,
      source: "righthand-ai-hackathon"
    }
  };
}

function membershipRequestBodies(role) {
  const metadata = {
    demo_role: role,
    source: "righthand-ai-hackathon"
  };
  return [
    {
      membership: {
        roles: [role],
        metadata
      },
      send_invitation_email: sendInvitationEmail
    },
    { membership: membershipWithRoleObjects(role) },
    { membership: membershipWithRoleNames(role, "role_name") },
    {
      roles: [role],
      metadata,
      send_invitation_email: sendInvitationEmail
    },
    {
      roles: [{ name: role }],
      metadata,
      send_invitation_email: sendInvitationEmail
    },
    {
      roles: [{ role_name: role }],
      metadata,
      sendInvitationEmail
    },
    {
      role_names: [role],
      metadata,
      send_invitation_email: sendInvitationEmail
    },
    {
      roleNames: [role],
      metadata,
      sendInvitationEmail
    }
  ];
}

function membershipWithRoleNames(role, key = "name") {
  return {
    roles: [{ [key]: role }],
    metadata: {
      demo_role: role,
      source: "righthand-ai-hackathon"
    }
  };
}

function apiErrorMessage(data) {
  if (!data || typeof data !== "object") return "request failed";
  return data.error_description || data.error || data.message || JSON.stringify(data).slice(0, 500);
}

function camel(value) {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function scalekitPathKey(value) {
  return encodeURIComponent(value).replaceAll("%3A", ":").replaceAll("%2E", ".");
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
