export type TunnelMode = "off" | "quick" | "named";

export interface TunnelNamedPublic {
  accountId: string;
  zoneId: string;
  dashboardHostname: string;
  haHostname: string;
  tunnelId: string | null;
  apiTokenConfigured: boolean;
}

export interface TunnelStatus {
  available: boolean;
  mode: TunnelMode;
  running: boolean;
  dashboardUrl: string | null;
  haUrl: string | null;
  error: string | null;
  named: TunnelNamedPublic | null;
  dashboardOrigin?: string;
  haOrigin?: string;
  updatedAt?: string | null;
}

export interface NamedConfigureInput {
  apiToken?: string;
  accountId: string;
  zoneId: string;
  dashboardHostname: string;
  haHostname: string;
}

function tunnelUrl(path: string): URL {
  const normalized = path.replace(/^\//, "");
  return new URL(`api/tunnel/${normalized}`, window.location.href);
}

async function parseResponse(res: Response): Promise<TunnelStatus & { error?: string }> {
  const text = await res.text();
  let body: (TunnelStatus & { error?: string }) | null = null;
  try {
    body = text ? (JSON.parse(text) as TunnelStatus & { error?: string }) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      body?.error || `Tunnel API error (${res.status})`;
    throw new Error(message);
  }
  if (!body) {
    throw new Error("Empty tunnel API response");
  }
  return body;
}

export async function fetchTunnelStatus(): Promise<TunnelStatus | null> {
  try {
    const res = await fetch(tunnelUrl("status"), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return null;
    }
    const body = await parseResponse(res);
    return { ...body, available: body.available !== false };
  } catch {
    return null;
  }
}

export async function startQuickTunnel(): Promise<TunnelStatus> {
  const res = await fetch(tunnelUrl("quick/start"), { method: "POST" });
  return parseResponse(res);
}

export async function stopQuickTunnel(): Promise<TunnelStatus> {
  const res = await fetch(tunnelUrl("quick/stop"), { method: "POST" });
  return parseResponse(res);
}

export async function configureNamedTunnel(
  input: NamedConfigureInput,
): Promise<TunnelStatus> {
  const res = await fetch(tunnelUrl("named/configure"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(res);
}

export async function startNamedTunnel(): Promise<TunnelStatus> {
  const res = await fetch(tunnelUrl("named/start"), { method: "POST" });
  return parseResponse(res);
}

export async function stopNamedTunnel(): Promise<TunnelStatus> {
  const res = await fetch(tunnelUrl("named/stop"), { method: "POST" });
  return parseResponse(res);
}

export async function deleteNamedTunnel(
  cleanupCloudflare = false,
): Promise<TunnelStatus> {
  const res = await fetch(tunnelUrl("named"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cleanupCloudflare }),
  });
  return parseResponse(res);
}
