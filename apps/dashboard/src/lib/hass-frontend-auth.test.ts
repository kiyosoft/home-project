import { describe, expect, it } from "vitest";

import { parseHassFrontendAuth } from "./hass-frontend-auth";

const ORIGIN = "https://homeassistant.local:8123";

describe("parseHassFrontendAuth", () => {
  it("reads a Home Assistant frontend refresh grant", () => {
    expect(
      parseHassFrontendAuth(
        {
          hassUrl: ORIGIN,
          clientId: `${ORIGIN}/`,
          access_token: "access",
          refresh_token: "refresh",
          expires: 1_700_000_000_000,
        },
        ORIGIN,
      ),
    ).toEqual({
      kind: "oauth",
      tokens: {
        accessToken: "access",
        refreshToken: "refresh",
        clientId: `${ORIGIN}/`,
        expires: 1_700_000_000_000,
      },
    });
  });

  it("falls back to the access token when there is no refresh grant", () => {
    expect(
      parseHassFrontendAuth({ access_token: "access-only" }, ORIGIN),
    ).toEqual({ kind: "token", token: "access-only" });
  });

  it("rejects empty payloads", () => {
    expect(parseHassFrontendAuth(null, ORIGIN)).toBeNull();
    expect(parseHassFrontendAuth({ refresh_token: "x" }, ORIGIN)).toBeNull();
  });
});
