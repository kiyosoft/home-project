import { ERR_INVALID_AUTH } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it, vi } from "vitest";

import { connectLiveWithTokens } from "./live";

/**
 * `ERR_INVALID_AUTH` reaches the caller for two unrelated reasons: Home
 * Assistant refusing the refresh token, and anything at all answering the
 * socket with `auth_invalid`. Only the first should cost the user a login, so
 * the callback that separates them is worth pinning down.
 */

const EXPIRED_TOKENS = {
  accessToken: "stale",
  refreshToken: "refresh-me",
  clientId: "https://example.test/app/",
  expires: Date.now() - 1000,
};

/** Opens, accepts whatever is sent, and reports a close when asked to. */
class FakeWebSocket extends EventTarget {
  readyState = 1;

  constructor(readonly url: string) {
    super();
    setTimeout(() => this.dispatchEvent(new Event("open")), 0);
  }

  send(): void {}

  close(): void {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
}

function stubTokenEndpoint(status: number, body: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
  vi.stubGlobal("WebSocket", FakeWebSocket);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("connectLiveWithTokens", () => {
  it("reports a refused refresh token through onInvalidGrant", async () => {
    stubTokenEndpoint(400, '{"error":"invalid_grant"}');
    const onInvalidGrant = vi.fn();

    await expect(
      connectLiveWithTokens({
        baseUrl: "http://homeassistant.local",
        tokens: EXPIRED_TOKENS,
        onInvalidGrant,
      }),
    ).rejects.toBe(ERR_INVALID_AUTH);

    expect(onInvalidGrant).toHaveBeenCalled();
  });

  it("leaves onInvalidGrant alone when the address is merely unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network request failed");
      }),
    );
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const onInvalidGrant = vi.fn();

    await expect(
      connectLiveWithTokens({
        baseUrl: "http://homeassistant.local",
        tokens: EXPIRED_TOKENS,
        onInvalidGrant,
      }),
    ).rejects.toBeDefined();

    expect(onInvalidGrant).not.toHaveBeenCalled();
  });

  it("leaves onInvalidGrant alone when the server rejects the access token", async () => {
    // What a reverse proxy or captive portal produces. The grant is untouched,
    // so a retry can still recover and the session must survive.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ access_token: "fresh", expires_in: 1800 }),
          ),
      ),
    );
    vi.stubGlobal(
      "WebSocket",
      class extends FakeWebSocket {
        override send(): void {
          this.dispatchEvent(
            Object.assign(new Event("message"), {
              data: JSON.stringify({ type: "auth_invalid" }),
            }),
          );
        }
      },
    );
    const onInvalidGrant = vi.fn();

    await expect(
      connectLiveWithTokens({
        baseUrl: "http://homeassistant.local",
        tokens: EXPIRED_TOKENS,
        onInvalidGrant,
      }),
    ).rejects.toBe(ERR_INVALID_AUTH);

    expect(onInvalidGrant).not.toHaveBeenCalled();
  });
});
