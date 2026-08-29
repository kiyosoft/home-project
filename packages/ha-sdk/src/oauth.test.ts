import { afterEach, describe, expect, it, vi } from "vitest";

import { HaOAuthError, refreshTokens } from "./oauth";

/**
 * The token endpoint is where a session lives or dies, so these cover the two
 * outcomes the app treats completely differently: a grant Home Assistant has
 * refused, which costs the user a login, and an address that never answers,
 * which must stay retryable no matter how long it hangs.
 */

const REFRESH = {
  baseUrl: "http://homeassistant.local",
  clientId: "https://example.test/app/",
  refreshToken: "refresh-me",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("refreshTokens", () => {
  it("reports a refused grant as invalid-grant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('{"error":"invalid_grant"}', {
            status: 400,
          }),
      ),
    );

    await expect(refreshTokens(REFRESH)).rejects.toMatchObject({
      kind: "invalid-grant",
    });
  });

  it("keeps the rotated refresh token when Home Assistant sends one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              access_token: "fresh",
              expires_in: 1800,
              refresh_token: "rotated",
            }),
          ),
      ),
    );

    const tokens = await refreshTokens(REFRESH);
    expect(tokens.accessToken).toBe("fresh");
    expect(tokens.refreshToken).toBe("rotated");
  });

  it("falls back to the refresh token it was given", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ access_token: "fresh", expires_in: 1800 }),
          ),
      ),
    );

    expect((await refreshTokens(REFRESH)).refreshToken).toBe("refresh-me");
  });

  it("gives up on an address that never answers, and calls it unreachable", async () => {
    // A hang here used to hold a cold start for the platform default, a minute
    // on iOS, with no way to move on to the next address.
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new Error("Aborted"));
            });
          }),
      ),
    );

    const settled = refreshTokens(REFRESH).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10000);
    const failure = await settled;

    expect(failure).toBeInstanceOf(HaOAuthError);
    expect(failure).toMatchObject({ kind: "unreachable" });
  });
});
