import type { ConnectionStatus } from "@ethio/ha-sdk";

/**
 * Demo is always live. A live hub only drives tiles while the socket is up,
 * so a restored snapshot cannot paint yesterday's lamps as if they were on.
 */
export function isLiveSession(
  mode: "live" | "demo" | null,
  status: ConnectionStatus,
): boolean {
  return mode === "demo" || status === "connected";
}
