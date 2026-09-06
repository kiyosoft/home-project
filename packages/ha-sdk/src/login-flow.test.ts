import { afterEach, describe, expect, it, vi } from "vitest";

import { signInWithPassword, submitMfaCode } from "./login-flow";

const HUB = "http://homeassistant.local:8123";
const CLIENT_ID = `${HUB}/`;

const TOKENS = {
  access_token: "access-me",
  refresh_token: "refresh-me",
  expires_in: 1800,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function routeFetch(
  routes: Record<string, (init?: RequestInit) => Response | Promise<Response>>,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const handler = Object.entries(routes).find(([prefix]) =>
      url.startsWith(prefix),
    )?.[1];
    if (!handler) {
      throw new Error(`Unexpected fetch: ${url}`);
    }
    return handler(init);
  });
}

describe("signInWithPassword", () => {
  it("exchanges a finished login flow for tokens", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`${HUB}/auth/login_flow/`]: () =>
          jsonResponse({ type: "create_entry", result: "the-code" }),
        [`${HUB}/auth/login_flow`]: () =>
          jsonResponse({ flow_id: "flow-1", type: "form", step_id: "init" }),
        [`${HUB}/auth/token`]: () => jsonResponse(TOKENS),
      }),
    );

    const step = await signInWithPassword({
      baseUrl: `${HUB}/`,
      username: "kidus",
      password: "secret",
    });

    expect(step).toEqual({
      kind: "tokens",
      tokens: {
        accessToken: "access-me",
        refreshToken: "refresh-me",
        clientId: CLIENT_ID,
        expires: expect.any(Number),
      },
    });
  });

  it("reports a rejected password as invalid-auth", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`${HUB}/auth/login_flow/`]: () =>
          jsonResponse({
            type: "form",
            step_id: "init",
            flow_id: "flow-1",
            errors: { base: "invalid_auth" },
          }),
        [`${HUB}/auth/login_flow`]: () =>
          jsonResponse({ flow_id: "flow-1", type: "form", step_id: "init" }),
      }),
    );

    await expect(
      signInWithPassword({
        baseUrl: HUB,
        username: "kidus",
        password: "wrong",
      }),
    ).resolves.toEqual({ kind: "failure", failure: "invalid-auth" });
  });

  it("pauses on a second-factor step", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`${HUB}/auth/login_flow/`]: () =>
          jsonResponse({
            type: "form",
            step_id: "mfa",
            flow_id: "flow-mfa",
          }),
        [`${HUB}/auth/login_flow`]: () =>
          jsonResponse({ flow_id: "flow-1", type: "form", step_id: "init" }),
      }),
    );

    await expect(
      signInWithPassword({
        baseUrl: HUB,
        username: "kidus",
        password: "secret",
      }),
    ).resolves.toEqual({ kind: "mfa", flowId: "flow-mfa" });
  });

  it("reports a lockout as blocked", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`${HUB}/auth/login_flow`]: () => jsonResponse({}, 403),
      }),
    );

    await expect(
      signInWithPassword({
        baseUrl: HUB,
        username: "kidus",
        password: "secret",
      }),
    ).resolves.toEqual({ kind: "failure", failure: "blocked" });
  });

  it("reports a network failure as unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(
      signInWithPassword({
        baseUrl: HUB,
        username: "kidus",
        password: "secret",
      }),
    ).resolves.toEqual({ kind: "failure", failure: "unreachable" });
  });
});

describe("submitMfaCode", () => {
  it("exchanges a verified code for tokens", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`${HUB}/auth/login_flow/flow-mfa`]: () =>
          jsonResponse({ type: "create_entry", result: "the-code" }),
        [`${HUB}/auth/token`]: () => jsonResponse(TOKENS),
      }),
    );

    const step = await submitMfaCode({
      baseUrl: HUB,
      flowId: "flow-mfa",
      code: "123456",
    });

    expect(step).toEqual({
      kind: "tokens",
      tokens: {
        accessToken: "access-me",
        refreshToken: "refresh-me",
        clientId: CLIENT_ID,
        expires: expect.any(Number),
      },
    });
  });

  it("reports a rejected code as invalid-code", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`${HUB}/auth/login_flow/flow-mfa`]: () =>
          jsonResponse({
            type: "form",
            step_id: "mfa",
            flow_id: "flow-mfa",
            errors: { base: "invalid_code" },
          }),
      }),
    );

    await expect(
      submitMfaCode({
        baseUrl: HUB,
        flowId: "flow-mfa",
        code: "000000",
      }),
    ).resolves.toEqual({ kind: "failure", failure: "invalid-code" });
  });
});
