// Idempotent provisioner: ensures the Umami website record exists and matches config.
// Run once at stack startup (see docker-compose.yml umami-provision service).

const config = {
  baseUrl: requiredEnv("UMAMI_BASE_URL").replace(/\/$/, ""),
  username: requiredEnv("UMAMI_ADMIN_USERNAME"),
  adminPassword: requiredEnv("UMAMI_ADMIN_PASSWORD"),
  bootstrapPassword: requiredEnv("UMAMI_BOOTSTRAP_PASSWORD"),
  websiteId: requiredEnv("UMAMI_WEBSITE_ID"),
  websiteName: requiredEnv("UMAMI_WEBSITE_NAME"),
  websiteDomain: requiredEnv("UMAMI_WEBSITE_DOMAIN"),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonRequest = async (path, options = {}) => {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = parseResponse(text);

  if (!response.ok) {
    const error = new Error(
      `${options.method ?? "GET"} ${path} failed with ${response.status}`,
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

await waitForUmami();

// Try the configured password first; fall back to the Umami bootstrap default on a
// fresh install, then immediately rotate it to the configured password.
let login = await loginWithPassword(config.adminPassword);

if (!login) {
  login = await loginWithPassword(config.bootstrapPassword);

  if (!login) {
    throw new Error(
      "Unable to log in to Umami with admin or bootstrap password",
    );
  }

  await rotateAdminPassword(login);
  login = await loginWithPassword(config.adminPassword);

  if (!login) {
    throw new Error("Unable to log in to Umami after rotating admin password");
  }
}

await provisionWebsite(login.token);

// Umami can take a few seconds to become ready after the container starts.
// Poll /api/heartbeat for up to 2 minutes before giving up.
async function waitForUmami() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      await jsonRequest("/api/heartbeat");
      console.log("Umami is healthy");
      return;
    } catch (error) {
      if (attempt === 60) {
        throw error;
      }
      await sleep(2000);
    }
  }
}

async function loginWithPassword(password) {
  try {
    return await jsonRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: config.username,
        password,
      }),
    });
  } catch (error) {
    // Treat auth failures as "wrong password", not a hard error.
    if (error.status === 401 || error.status === 403) {
      return null;
    }
    throw error;
  }
}

async function rotateAdminPassword(login) {
  if (config.adminPassword === config.bootstrapPassword) {
    console.log("Admin password already matches bootstrap password");
    return;
  }

  await jsonRequest(`/api/users/${login.user.id}`, {
    method: "POST",
    headers: authHeaders(login.token),
    body: JSON.stringify({
      username: config.username,
      password: config.adminPassword,
      role: "admin",
    }),
  });

  console.log("Rotated Umami admin password");
}

// Create the website if it does not exist yet; update only the fields that drifted.
// The website ID is fixed (from UMAMI_WEBSITE_ID) so the tracker script never needs
// to change between deployments.
async function provisionWebsite(token) {
  const existing = await getWebsite(token, config.websiteId);

  if (!existing) {
    await jsonRequest("/api/websites", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        id: config.websiteId,
        name: config.websiteName,
        domain: config.websiteDomain,
      }),
    });

    console.log(`Created Umami website ${config.websiteId}`);
    return;
  }

  if (
    existing.name !== config.websiteName ||
    existing.domain !== config.websiteDomain
  ) {
    await jsonRequest(`/api/websites/${config.websiteId}`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        name: config.websiteName,
        domain: config.websiteDomain,
        // Preserve the existing share token so public dashboard links stay valid.
        shareId: existing.shareId ?? null,
      }),
    });

    console.log(`Updated Umami website ${config.websiteId}`);
    return;
  }

  console.log(`Umami website ${config.websiteId} already provisioned`);
}

async function getWebsite(token, websiteId) {
  try {
    return await jsonRequest(`/api/websites/${websiteId}`, {
      headers: authHeaders(token),
    });
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set`);
  }

  return value;
}

function parseResponse(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
