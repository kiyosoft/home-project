#!/usr/bin/env node
/**
 * Cloudflare Tunnel helper for Ethio Home.
 *
 * Quick mode (default): two Quick Tunnels — dashboard + Home Assistant.
 * Named mode: single tunnel from scripts/tunnel/config.yml (see config.example.yml).
 *
 * Env:
 *   ETHIO_TUNNEL_MODE        quick | named  (default: quick)
 *   ETHIO_DASHBOARD_ORIGIN   default http://127.0.0.1:5180
 *   ETHIO_HA_ORIGIN          default http://127.0.0.1:8123
 *   ETHIO_TUNNEL_CONFIG      default <this-dir>/config.yml
 *   CLOUDFLARED_BIN          default cloudflared
 *
 * Flags: --quick | --named
 */

import { spawn } from "node:child_process";
import dns from "node:dns/promises";
import { existsSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URLS_FILE = path.join(__dirname, ".urls.json");
const DEFAULT_CONFIG = path.join(__dirname, "config.yml");
const EXAMPLE_CONFIG = path.join(__dirname, "config.example.yml");

const TRYCLOUDFLARE_RE =
  /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi;

function resolveMode(argv) {
  if (argv.includes("--named")) return "named";
  if (argv.includes("--quick")) return "quick";
  const env = (process.env.ETHIO_TUNNEL_MODE ?? "quick").toLowerCase();
  if (env === "named" || env === "quick") return env;
  fail(`Unknown ETHIO_TUNNEL_MODE="${env}". Use quick or named.`);
}

function fail(message) {
  console.error(`\n[tunnel] ${message}\n`);
  process.exit(1);
}

function resolveCloudflared() {
  return process.env.CLOUDFLARED_BIN?.trim() || "cloudflared";
}

function whichSync(bin) {
  return new Promise((resolve) => {
    const child = spawn(bin, ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      out += d;
    });
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      resolve(code === 0 ? out.trim().split("\n")[0] : null);
    });
  });
}

function extractTrycloudflareUrl(chunk, state) {
  state.buf += chunk;
  const matches = state.buf.match(TRYCLOUDFLARE_RE);
  if (!matches?.length) return null;
  // Prefer the last match; cloudflared may log the URL more than once.
  return matches[matches.length - 1];
}

function spawnCloudflared(bin, args, label) {
  const child = spawn(bin, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const prefix = `[tunnel:${label}]`;
  const onLine = (stream) => (data) => {
    const text = data.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) console.log(`${prefix} ${line}`);
    }
  };

  child.stdout.on("data", onLine("stdout"));
  child.stderr.on("data", onLine("stderr"));

  child.on("error", (err) => {
    console.error(`${prefix} failed to start: ${err.message}`);
  });

  return child;
}

function waitForTrycloudflareUrl(child, label) {
  return new Promise((resolve, reject) => {
    const state = { buf: "" };
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const onData = (chunk) => {
      const url = extractTrycloudflareUrl(chunk.toString(), state);
      if (url) settle(resolve, url);
    };

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

function writeUrls(payload) {
  writeFileSync(URLS_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function hostHeaderForOrigin(origin) {
  try {
    const url = new URL(origin);
    // Prefer hostname without default ports; keep explicit non-default ports.
    if (
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443") ||
      !url.port
    ) {
      return url.hostname;
    }
    return url.host;
  } catch {
    return null;
  }
}

function isIpLiteral(hostname) {
  return net.isIP(hostname) !== 0;
}

/**
 * Resolve hostname → IP connect URL.
 * Needed for .local (mDNS): Node HTTP + short timeouts often lose the DNS race
 * even when browsers / ping resolve fine. Keep the original Host for HA.
 */
async function resolveConnectOrigin(origin, { timeoutMs = 10000 } = {}) {
  let url;
  try {
    url = new URL(origin);
  } catch {
    fail(`Invalid origin URL: ${origin}`);
  }

  if (isIpLiteral(url.hostname) || url.hostname === "localhost") {
    return { connectOrigin: origin, resolvedAddress: null };
  }

  const lookup = dns.lookup(url.hostname, { family: 4 });
  const timedOut = new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `DNS lookup timed out after ${timeoutMs}ms for ${url.hostname}`,
          ),
        ),
      timeoutMs,
    ).unref();
  });

  try {
    const { address } = await Promise.race([lookup, timedOut]);
    const connect = new URL(origin);
    connect.hostname = address;
    return { connectOrigin: connect.href.replace(/\/$/, ""), resolvedAddress: address };
  } catch (err) {
    fail(
      `Could not resolve ${url.hostname} (${err.message}). ` +
        `Try an IP instead, e.g. ETHIO_HA_ORIGIN=http://192.168.1.50:8123`,
    );
  }
}

function printQuickSummary(dashboardUrl, haUrl) {
  console.log(`
[tunnel] Quick tunnels ready

  Dashboard:  ${dashboardUrl}
  Home Assistant: ${haUrl}

  1. Open the Dashboard URL in a browser
  2. On the setup screen, paste the Home Assistant URL + your long-lived access token
  3. URLs also written to ${URLS_FILE}

  Note: Quick Tunnel URLs change every run. Treat them and your HA token as secrets.

  If the HA URL shows "400: Bad Request", add this to Home Assistant configuration.yaml
  (trust the machine running cloudflared — often this Mac's LAN IP / subnet), then restart HA:

    http:
      use_x_forwarded_for: true
      trusted_proxies:
        - 192.168.100.0/24
`);
}

/** Probe that an HTTP(S) origin accepts connections (any status counts as up). */
function probeOrigin(origin, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(origin);
    } catch {
      resolve({ ok: false, error: "invalid URL" });
      return;
    }

    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      { method: "GET", timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve({ ok: true, status: res.statusCode });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    req.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });
    req.end();
  });
}

async function preflightOrigins(origins) {
  const results = await Promise.all(
    origins.map(async ({ label, origin }) => {
      const result = await probeOrigin(origin);
      return { label, origin, ...result };
    }),
  );

  const down = results.filter((r) => !r.ok);
  if (down.length === 0) return;

  console.error("[tunnel] Origin preflight failed — Cloudflare will return 502 until these respond:\n");
  for (const item of down) {
    console.error(`  • ${item.label}: ${item.origin}`);
    console.error(`    ${item.error}`);
  }
  console.error(`
Tips:
  • Dashboard: run \`pnpm dev\` first (listens on 127.0.0.1:5180)
  • HA: set ETHIO_HA_ORIGIN to wherever Home Assistant is reachable
    e.g. ETHIO_HA_ORIGIN=http://192.168.1.50:8123 pnpm tunnel
`);
  fail("Fix unreachable origins, then restart the tunnel.");
}

async function runQuick(bin) {
  const dashboardOrigin =
    process.env.ETHIO_DASHBOARD_ORIGIN?.trim() || "http://127.0.0.1:5180";
  const haOrigin =
    process.env.ETHIO_HA_ORIGIN?.trim() || "http://127.0.0.1:8123";

  const { connectOrigin: dashboardConnect } =
    await resolveConnectOrigin(dashboardOrigin);
  const { connectOrigin: haConnect, resolvedAddress: haResolved } =
    await resolveConnectOrigin(haOrigin);

  console.log(`[tunnel] Mode: quick`);
  console.log(`[tunnel] Dashboard origin: ${dashboardOrigin}`);
  console.log(
    `[tunnel] HA origin:        ${haOrigin}` +
      (haResolved ? ` → ${haConnect}` : ""),
  );

  await preflightOrigins([
    { label: "dashboard", origin: dashboardConnect },
    { label: "ha", origin: haConnect },
  ]);

  const haHostHeader =
    process.env.ETHIO_HA_HOST_HEADER?.trim() || hostHeaderForOrigin(haOrigin);

  console.log(`[tunnel] Starting two Quick Tunnels (Ctrl+C to stop)…`);
  if (haHostHeader) {
    console.log(`[tunnel] HA Host header:     ${haHostHeader}`);
  }
  console.log("");

  const dashChild = spawnCloudflared(
    bin,
    ["tunnel", "--url", dashboardConnect],
    "dashboard",
  );
  const haArgs = ["tunnel", "--url", haConnect];
  if (haHostHeader) {
    haArgs.push("--http-host-header", haHostHeader);
  }
  const haChild = spawnCloudflared(bin, haArgs, "ha");

  const children = [dashChild, haChild];
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[tunnel] Stopping (${signal})…`);
    for (const child of children) {
      if (!child.killed) child.kill("SIGTERM");
    }
    // Force-kill if still alive shortly after.
    setTimeout(() => {
      for (const child of children) {
        if (!child.killed) child.kill("SIGKILL");
      }
      process.exit(signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1);
    }, 2000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  for (const child of children) {
    child.on("close", (code, signal) => {
      if (shuttingDown) return;
      console.error(
        `[tunnel] A cloudflared process exited unexpectedly (code=${code}, signal=${signal ?? "none"}). Stopping the other.`,
      );
      shutdown("child-exit");
    });
  }

  try {
    const [dashboardUrl, haUrl] = await Promise.all([
      waitForTrycloudflareUrl(dashChild, "dashboard"),
      waitForTrycloudflareUrl(haChild, "ha"),
    ]);

    writeUrls({
      mode: "quick",
      dashboardUrl,
      haUrl,
      dashboardOrigin,
      haOrigin,
      dashboardConnect,
      haConnect,
      createdAt: new Date().toISOString(),
    });
    printQuickSummary(dashboardUrl, haUrl);
  } catch (err) {
    console.error(`[tunnel] ${err.message}`);
    shutdown("error");
  }

  // Keep process alive while children run.
  await new Promise(() => {});
}

async function runNamed(bin) {
  const configPath =
    process.env.ETHIO_TUNNEL_CONFIG?.trim() || DEFAULT_CONFIG;

  if (!existsSync(configPath)) {
    fail(
      `Named tunnel config not found: ${configPath}\n` +
        `  Copy ${EXAMPLE_CONFIG} → ${DEFAULT_CONFIG}, fill in tunnel UUID / credentials / hostnames,\n` +
        `  then create DNS routes in Cloudflare and run: pnpm tunnel:named`,
    );
  }

  console.log(`[tunnel] Mode: named`);
  console.log(`[tunnel] Config: ${configPath}`);
  console.log(`[tunnel] Starting named tunnel (Ctrl+C to stop)…\n`);

  const child = spawn(bin, ["tunnel", "--config", configPath, "run"], {
    stdio: "inherit",
    env: process.env,
  });

  const shutdown = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const code = await new Promise((resolve) => {
    child.on("error", (err) => {
      fail(`Failed to start cloudflared: ${err.message}`);
    });
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });
  process.exit(code);
}

async function main() {
  const mode = resolveMode(process.argv.slice(2));
  const bin = resolveCloudflared();
  const version = await whichSync(bin);
  if (!version) {
    fail(
      `cloudflared not found ("${bin}"). Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ then retry.`,
    );
  }
  console.log(`[tunnel] Using ${bin} (${version})`);

  if (mode === "named") {
    await runNamed(bin);
  } else {
    await runQuick(bin);
  }
}

main().catch((err) => {
  fail(err?.stack || String(err));
});
