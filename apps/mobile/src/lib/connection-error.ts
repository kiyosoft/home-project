import type { MessageKey } from "@/i18n";

/**
 * home-assistant-js-websocket rejects with a bare number rather than an Error.
 * The values are duplicated here on purpose: the library is a transitive
 * dependency of @ethio/ha-sdk, so importing it from the app would be a phantom
 * dependency that pnpm's isolated layout refuses to resolve.
 */
const ERR_CANNOT_CONNECT = 1;
const ERR_INVALID_AUTH = 2;
const ERR_CONNECTION_LOST = 3;

export type ConnectFailure =
  /** Nothing answered — the address is the suspect half. */
  | { kind: "unreachable" }
  /** The server answered and refused the token — the address is confirmed good. */
  | { kind: "token-rejected" }
  | { kind: "connection-lost" }
  | { kind: "unknown"; detail?: string };

export function classifyConnectError(error: unknown): ConnectFailure {
  if (typeof error === "number") {
    switch (error) {
      case ERR_CANNOT_CONNECT:
        return { kind: "unreachable" };
      case ERR_INVALID_AUTH:
        return { kind: "token-rejected" };
      case ERR_CONNECTION_LOST:
        return { kind: "connection-lost" };
      default:
        return { kind: "unknown" };
    }
  }

  if (error instanceof Error) {
    return { kind: "unknown", detail: error.message };
  }

  return { kind: "unknown" };
}

export function failureMessageKey(failure: ConnectFailure): MessageKey {
  switch (failure.kind) {
    case "unreachable":
      return "setup.errorUnreachable";
    case "token-rejected":
      return "setup.errorTokenRejected";
    case "connection-lost":
      return "setup.errorConnectionLost";
    case "unknown":
      return "setup.errorGeneric";
  }
}

/** Which field the screen should mark as the failing one. */
export function failureField(
  failure: ConnectFailure | null,
): "address" | "token" | null {
  switch (failure?.kind) {
    case "unreachable":
      return "address";
    case "token-rejected":
      return "token";
    default:
      return null;
  }
}
