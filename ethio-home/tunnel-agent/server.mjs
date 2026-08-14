#!/usr/bin/env node
/**
 * Ethio Home tunnel agent — runs inside the HA add-on.
 * Listens on 127.0.0.1:8098; nginx proxies /api/tunnel/ → here.
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = 8098;
const DATA_DIR = process.env.ETHIO_TUNNEL_DATA ?? "/data";
const STATE_PATH = path.join(DATA_DIR, "ethio-tunnel.json");
const CLOUDFLARED =
  process.env.CLOUDFLARED_BIN?.trim() || "cloudflared";
const DASHBOARD_ORIGIN =
  process.env.ETHIO_DASHBOARD_ORIGIN?.trim() || "http://127.0.0.1:8100";
const HA_ORIGIN =
  process.env.ETHIO_HA_ORIGIN?.trim() || "http://homeassistant:8123";
const HA_HOST_HEADER =
  process.env.ETHIO_HA_HOST_HEADER?.trim() || "homeassistant";
const TUNNEL_NAME =
  process.env.ETHIO_TUNNEL_NAME?.trim() || "ethio-home";
const CF_API = "https://api.cloudflare.com/client/v4";
const TRYCLOUDFLARE_RE =
  /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi;
const URL_WAIT_MS = 90_000;

/** @type {import('node:child_process').ChildProcess[]} */
let quickChildren = [];
/** @type {import('node:child_process').ChildProcess | null} */
let namedChild = null;

/** @type {TunnelState} */
let state = loadState();

/**
 * @typedef {object} NamedConfig
 * @property {string} accountId
 * @property {string} zoneId
 * @property {string} dashboardHostname
 * @property {string} haHostname
 * @property {string} [tunnelId]
 * @property {string} [tunnelToken]
 * @property {boolean} [apiTokenConfigured]
 * @property {string} [apiToken]
 */

/**
 * @typedef {object} TunnelState
 * @property {"off"|"quick"|"named"} mode
 * @property {boolean} running
 * @property {string|null} dashboardUrl
 * @property {string|null} haUrl
 * @property {string|null} error
 * @property {NamedConfig|null} named
 * @property {string|null} updatedAt
 */

function defaultState() {
  return {
    mode: "off",
    running: false,
    dashboardUrl: null,
    haUrl: null,
    error: null,
    named: null,
    updatedAt: null,
  };
}

function loadState() {
  try {
    if (!existsSync(STATE_PATH)) return defaultState();
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    return {
      ...defaultState(),
      ...raw,
      running: false,
      error: null,
    };
  } catch {
    return defaultState();
  }
}

function persistState() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const toWrite = {
      ...state,
      named: state.named
        ? {
            accountId: state.named.accountId,
            zoneId: state.named.zoneId,
            dashboardHostname: state.named.dashboardHostname,
            haHostname: state.named.haHostname,
            tunnelId: state.named.tunnelId,
            tunnelToken: state.named.tunnelToken,
            apiTokenConfigured: Boolean(state.named.apiToken),
            // Persist api token for restart restore / cleanup only on disk.
            apiToken: state.named.apiToken,
          }
        : null,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(STATE_PATH, `${JSON.stringify(toWrite, null, 2)}\n`, "utf8");
  } catch (err) {
    console.error("[tunnel-agent] failed to persist state:", err.message);
  }
}

function publicStatus() {
  const named = state.named
    ? {
        accountId: state.named.accountId,
        zoneId: state.named.zoneId,
        dashboardHostname: state.named.dashboardHostname,
        haHostname: state.named.haHostname,
        tunnelId: state.named.tunnelId ?? null,
        apiTokenConfigured: Boolean(state.named.apiToken),
      }
    : null;

  return {
    available: true,
    mode: state.mode,
    running: state.running,
    dashboardUrl: state.dashboardUrl,
    haUrl: state.haUrl,
    error: state.error,
    named,
    dashboardOrigin: DASHBOARD_ORIGIN,
    haOrigin: HA_ORIGIN,
    updatedAt: state.updatedAt,
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function extractTrycloudflareUrl(chunk, bufState) {
  bufState.buf += chunk;
  const matches = bufState.buf.match(TRYCLOUDFLARE_RE);
  if (!matches?.length) return null;
  return matches[matches.length - 1];
}

function killProcess(child) {
  if (!child || child.killed) return;
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    if (!child.killed) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
  }, 2000).unref();
}

function stopQuick() {
  for (const child of quickChildren) killProcess(child);
  quickChildren = [];
}

function stopNamed() {
  if (namedChild) {
    killProcess(namedChild);
    namedChild = null;
  }
}

function stopAll() {
  stopQuick();
  stopNamed();
  state.running = false;
  if (state.mode === "quick") {
    state.dashboardUrl = null;
    state.haUrl = null;
  }
}

function spawnCloudflared(args, label) {
  const child = spawn(CLOUDFLARED, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  const prefix = `[tunnel-agent:${label}]`;
  const onLine = (data) => {
    const text = data.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) console.log(`${prefix} ${line}`);
    }
  };
  child.stdout.on("data", onLine);
  child.stderr.on("data", onLine);
  child.on("error", (err) => {
    console.error(`${prefix} failed to start: ${err.message}`);
  });
  return child;
}

function waitForTrycloudflareUrl(child, label) {
  return new Promise((resolve, reject) => {
    const bufState = { buf: "" };
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const onData = (chunk) => {
      const url = extractTrycloudflareUrl(chunk.toString(), bufState);
      if (url) settle(resolve, url);
    };

    const timer = setTimeout(() => {
      settle(
        reject,
        new Error(`${label}: timed out waiting for trycloudflare URL`),
      );
    }, URL_WAIT_MS);

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (err) =>
      settle(reject, new Error(`${label}: ${err.message}`)),
    );
    child.on("close", (code, signal) => {
      settle(
        reject,
        new Error(
          `${label}: cloudflared exited before publishing a URL (code=${code}, signal=${signal ?? "none"})`,
        ),
      );
    });
  });
}

async function cfFetch(apiToken, method, apiPath, body) {
  const res = await fetch(`${CF_API}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const errMsg =
      json?.errors?.map((e) => e.message).join("; ") ||
      `Cloudflare API ${res.status}`;
    const error = new Error(errMsg);
    error.status = res.status;
    error.details = json;
    throw error;
  }
  return json.result;
}

async function listTunnels(apiToken, accountId) {
  return cfFetch(
    apiToken,
    "GET",
    `/accounts/${accountId}/cfd_tunnel?is_deleted=false`,
  );
}

async function createTunnel(apiToken, accountId, name) {
  return cfFetch(apiToken, "POST", `/accounts/${accountId}/cfd_tunnel`, {
    name,
    config_src: "cloudflare",
  });
}

async function getTunnelToken(apiToken, accountId, tunnelId) {
  return cfFetch(
    apiToken,
    "GET",
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`,
  );
}

async function putTunnelConfig(apiToken, accountId, tunnelId, ingress) {
  return cfFetch(
    apiToken,
    "PUT",
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`,
    { config: { ingress } },
  );
}

async function ensureDnsCname(apiToken, zoneId, hostname, tunnelId) {
  const content = `${tunnelId}.cfargotunnel.com`;
  const existing = await cfFetch(
    apiToken,
    "GET",
    `/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`,
  );
  const list = Array.isArray(existing) ? existing : [];
  if (list.length > 0) {
    const record = list[0];
    if (record.content === content && record.proxied) return record;
    return cfFetch(
      apiToken,
      "PATCH",
      `/zones/${zoneId}/dns_records/${record.id}`,
      { type: "CNAME", name: hostname, content, proxied: true },
    );
  }
  return cfFetch(apiToken, "POST", `/zones/${zoneId}/dns_records`, {
    type: "CNAME",
    name: hostname,
    content,
    proxied: true,
  });
}

async function deleteTunnel(apiToken, accountId, tunnelId) {
  return cfFetch(
    apiToken,
    "DELETE",
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}`,
  );
}

function namedIngress(dashboardHostname, haHostname) {
  return [
    {
      hostname: dashboardHostname,
      service: DASHBOARD_ORIGIN,
      originRequest: {},
    },
    {
      hostname: haHostname,
      service: HA_ORIGIN,
      originRequest: {
        httpHostHeader: HA_HOST_HEADER,
      },
    },
    { service: "http_status:404" },
  ];
}

async function startQuick() {
  stopAll();
  state.mode = "quick";
  state.error = null;
  state.dashboardUrl = null;
  state.haUrl = null;
  state.running = false;
  persistState();

  const dashChild = spawnCloudflared(
    ["tunnel", "--url", DASHBOARD_ORIGIN],
    "dashboard",
  );
  const haChild = spawnCloudflared(
    ["tunnel", "--url", HA_ORIGIN, "--http-host-header", HA_HOST_HEADER],
    "ha",
  );
  quickChildren = [dashChild, haChild];

  const onUnexpectedExit = () => {
    if (!state.running || state.mode !== "quick") return;
    state.running = false;
    state.error = "Quick tunnel process exited unexpectedly";
    state.dashboardUrl = null;
    state.haUrl = null;
    stopQuick();
    persistState();
  };
  for (const child of quickChildren) {
    child.on("close", onUnexpectedExit);
  }

  try {
    const [dashboardUrl, haUrl] = await Promise.all([
      waitForTrycloudflareUrl(dashChild, "dashboard"),
      waitForTrycloudflareUrl(haChild, "ha"),
    ]);
    state.dashboardUrl = dashboardUrl;
    state.haUrl = haUrl;
    state.running = true;
    state.error = null;
    persistState();
    return publicStatus();
  } catch (err) {
    stopQuick();
    state.running = false;
    state.mode = "off";
    state.error = err.message;
    persistState();
    throw err;
  }
}

async function configureNamed(body) {
  const apiToken = String(body.apiToken ?? "").trim();
  const accountId = String(body.accountId ?? "").trim();
  const zoneId = String(body.zoneId ?? "").trim();
  const dashboardHostname = String(body.dashboardHostname ?? "")
    .trim()
    .toLowerCase();
  const haHostname = String(body.haHostname ?? "").trim().toLowerCase();

  const existingToken = state.named?.apiToken;
  const token = apiToken || existingToken;

  if (!token) throw new Error("Cloudflare API token is required");
  if (!accountId) throw new Error("Account ID is required");
  if (!zoneId) throw new Error("Zone ID is required");
  if (!dashboardHostname) throw new Error("Dashboard hostname is required");
  if (!haHostname) throw new Error("Home Assistant hostname is required");
  if (dashboardHostname === haHostname) {
    throw new Error("Dashboard and Home Assistant hostnames must differ");
  }

  stopAll();
  state.error = null;

  let tunnels = await listTunnels(token, accountId);
  if (!Array.isArray(tunnels)) tunnels = [];
  let tunnel = tunnels.find((t) => t.name === TUNNEL_NAME);
  if (!tunnel) {
    tunnel = await createTunnel(token, accountId, TUNNEL_NAME);
  }

  const tunnelId = tunnel.id;
  await putTunnelConfig(
    token,
    accountId,
    tunnelId,
    namedIngress(dashboardHostname, haHostname),
  );
  await ensureDnsCname(token, zoneId, dashboardHostname, tunnelId);
  await ensureDnsCname(token, zoneId, haHostname, tunnelId);

  let tunnelToken = tunnel.token;
  if (!tunnelToken) {
    const tokenResult = await getTunnelToken(token, accountId, tunnelId);
    tunnelToken =
      typeof tokenResult === "string" ? tokenResult : tokenResult?.token;
  }
  if (!tunnelToken) {
    throw new Error("Cloudflare did not return a tunnel run token");
  }

  state.named = {
    accountId,
    zoneId,
    dashboardHostname,
    haHostname,
    tunnelId,
    tunnelToken,
    apiToken: token,
    apiTokenConfigured: true,
  };
  state.mode = "named";
  state.dashboardUrl = `https://${dashboardHostname}`;
  state.haUrl = `https://${haHostname}`;
  state.running = false;
  persistState();
  return publicStatus();
}

async function startNamed() {
  if (!state.named?.tunnelToken) {
    throw new Error("Named tunnel is not configured");
  }

  stopQuick();
  stopNamed();
  state.mode = "named";
  state.error = null;
  state.dashboardUrl = `https://${state.named.dashboardHostname}`;
  state.haUrl = `https://${state.named.haHostname}`;

  const child = spawnCloudflared(
    ["tunnel", "run", "--token", state.named.tunnelToken],
    "named",
  );
  namedChild = child;

  child.on("close", () => {
    if (namedChild !== child) return;
    namedChild = null;
    if (state.mode === "named" && state.running) {
      state.running = false;
      state.error = "Named tunnel process exited";
      persistState();
    }
  });

  // Brief wait to surface immediate spawn failures.
  await new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("error", onError);
      child.off("close", onClose);
      fn(value);
    };
    const onError = (err) => done(reject, err);
    const onClose = (code) =>
      done(
        reject,
        new Error(
          `cloudflared exited immediately (code=${code ?? "unknown"})`,
        ),
      );
    const timer = setTimeout(() => done(resolve), 800);
    child.on("error", onError);
    child.on("close", onClose);
  });

  state.running = true;
  state.error = null;
  persistState();
  return publicStatus();
}

async function deleteNamed(cleanupCloudflare) {
  stopNamed();
  state.running = false;

  if (cleanupCloudflare && state.named?.apiToken && state.named.tunnelId) {
    try {
      await deleteTunnel(
        state.named.apiToken,
        state.named.accountId,
        state.named.tunnelId,
      );
    } catch (err) {
      state.error = `Stopped locally; Cloudflare cleanup failed: ${err.message}`;
      state.mode = "off";
      state.named = null;
      state.dashboardUrl = null;
      state.haUrl = null;
      persistState();
      throw err;
    }
  }

  state.mode = "off";
  state.named = null;
  state.dashboardUrl = null;
  state.haUrl = null;
  state.error = null;
  persistState();
  return publicStatus();
}

async function restoreNamedOnBoot() {
  if (state.mode !== "named" || !state.named?.tunnelToken) return;
  console.log("[tunnel-agent] restoring named tunnel from saved state");
  try {
    await startNamed();
  } catch (err) {
    console.error("[tunnel-agent] restore failed:", err.message);
    state.running = false;
    state.error = err.message;
    persistState();
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (req.method === "GET" && pathname === "/status") {
      sendJson(res, 200, publicStatus());
      return;
    }

    if (req.method === "POST" && pathname === "/quick/start") {
      const status = await startQuick();
      sendJson(res, 200, status);
      return;
    }

    if (req.method === "POST" && pathname === "/quick/stop") {
      stopQuick();
      if (state.mode === "quick") {
        state.mode = "off";
        state.running = false;
        state.dashboardUrl = null;
        state.haUrl = null;
        state.error = null;
        persistState();
      }
      sendJson(res, 200, publicStatus());
      return;
    }

    if (req.method === "POST" && pathname === "/named/configure") {
      const body = await readJson(req);
      const status = await configureNamed(body);
      sendJson(res, 200, status);
      return;
    }

    if (req.method === "POST" && pathname === "/named/start") {
      const status = await startNamed();
      sendJson(res, 200, status);
      return;
    }

    if (req.method === "POST" && pathname === "/named/stop") {
      stopNamed();
      if (state.mode === "named") {
        state.running = false;
        state.error = null;
        persistState();
      }
      sendJson(res, 200, publicStatus());
      return;
    }

    if (req.method === "DELETE" && pathname === "/named") {
      const body = await readJson(req).catch(() => ({}));
      const cleanup = Boolean(body?.cleanupCloudflare);
      const status = await deleteNamed(cleanup);
      sendJson(res, 200, status);
      return;
    }

    sendJson(res, 404, { error: "Not found", available: true });
  } catch (err) {
    console.error("[tunnel-agent]", err);
    sendJson(res, err.status && err.status < 600 ? err.status : 500, {
      error: err.message || "Tunnel agent error",
      available: true,
      ...publicStatus(),
    });
  }
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`[tunnel-agent] listening on http://${HOST}:${PORT}`);
  void restoreNamedOnBoot();
});

function shutdown(signal) {
  console.log(`[tunnel-agent] shutting down (${signal})`);
  stopAll();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
