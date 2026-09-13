import { describe, expect, it, vi } from "vitest";

import {
  fetchIngressSession,
  ingressSessionUrl,
  isHassIngressPath,
  parseIngressSession,
} from "./ingress-session";

describe("isHassIngressPath", () => {
  it("detects Home Assistant ingress prefixes", () => {
    expect(isHassIngressPath("/api/hassio_ingress/abc123/")).toBe(true);
    expect(isHassIngressPath("/")).toBe(false);
  });
});

describe("ingressSessionUrl", () => {
  it("keeps the ingress token directory when the page has no trailing slash", () => {
    expect(
      ingressSessionUrl("https://homeassistant.local:8123/api/hassio_ingress/abc123"),
    ).toBe(
      "https://homeassistant.local:8123/api/hassio_ingress/abc123/api/ethio/session",
    );
  });

  it("stays under the ingress path when the page already has a trailing slash", () => {
    expect(
      ingressSessionUrl("https://homeassistant.local:8123/api/hassio_ingress/abc123/"),
    ).toBe(
      "https://homeassistant.local:8123/api/hassio_ingress/abc123/api/ethio/session",
    );
  });

  it("replaces an index document without leaving the ingress path", () => {
    expect(
      ingressSessionUrl(
        "https://homeassistant.local:8123/api/hassio_ingress/abc123/index.html",
      ),
    ).toBe(
      "https://homeassistant.local:8123/api/hassio_ingress/abc123/api/ethio/session",
    );
  });
});

describe("parseIngressSession", () => {
  it("requires a token", () => {
    expect(parseIngressSession({ ok: true })).toBeNull();
    expect(parseIngressSession({ token: "" })).toBeNull();
  });

  it("reads the token and ingress user", () => {
    expect(
      parseIngressSession({
        token: "ha-token",
        user: { id: "user-1", username: "kidus", name: "Kidus" },
      }),
    ).toEqual({
      token: "ha-token",
      user: { id: "user-1", username: "kidus", name: "Kidus" },
    });
  });
});

describe("fetchIngressSession", () => {
  it("returns null when the session endpoint is missing", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 401 }));
    await expect(
      fetchIngressSession("https://example.test/", fetcher),
    ).resolves.toBeNull();
  });

  it("parses a successful session", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ token: "ha-token", user: { id: "1" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(
      fetchIngressSession("https://example.test/", fetcher),
    ).resolves.toEqual({
      token: "ha-token",
      user: { id: "1", username: "", name: "" },
    });
  });
});
