/**
 * React Native ships a partial `URL`, so hostnames are picked apart with a
 * pattern rather than trusting property accessors that may not exist.
 */
const ORIGIN_PATTERN =
  /^(https?):\/\/(\[[0-9A-Fa-f:.]+\]|[^/:?#\s]+)(?::(\d{1,5}))?(?:[/?#]|$)/;

export interface Origin {
  scheme: "http" | "https";
  host: string;
  port: number | null;
}

export function parseOrigin(url: string): Origin | null {
  const match = ORIGIN_PATTERN.exec(url.trim());
  if (!match) return null;

  const port = match[3] ? Number(match[3]) : null;
  if (port !== null && (port < 1 || port > 65535)) return null;

  return {
    scheme: match[1]!.toLowerCase() as "http" | "https",
    host: match[2]!,
    port,
  };
}

export function isHttpUrl(url: string): boolean {
  return parseOrigin(url) !== null;
}

/**
 * Turns what somebody typed into an address we can actually connect to.
 *
 * People type `homeassistant.local`, not `http://homeassistant.local`, and
 * rejecting that outright reads as "cannot reach your home" when nothing was
 * ever tried. A hub on the local network is plain HTTP; anything that looks
 * like a public name is far likelier to be a reverse proxy, so that gets HTTPS.
 *
 * No port is filled in, so a bare host means the default for its scheme. An
 * install still listening on Home Assistant's old 8123 has to say so.
 *
 * Returns null only when the input cannot be read as an address at all.
 */
export function normalizeBaseUrl(input: string): string | null {
  const trimmed = trimTrailingSlash(input);
  if (!trimmed) return null;

  const hasScheme = /^https?:\/\//i.test(trimmed);
  // Parse behind a provisional scheme so the host can be inspected either way.
  const origin = parseOrigin(hasScheme ? trimmed : `http://${trimmed}`);
  if (!origin) return null;

  const scheme = hasScheme
    ? origin.scheme
    : isLocalHost(origin.host)
      ? "http"
      : "https";
  const port = origin.port === null ? "" : `:${origin.port}`;

  return `${scheme}://${origin.host}${port}`;
}

/** Whether this name can only resolve on the network the phone is sitting on. */
export function isLocalHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === "localhost" || !lower.includes(".")) return true;
  if (/\.(local|lan|home|internal|home\.arpa)$/.test(lower)) return true;
  return /^(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(lower);
}

/** True when `url` points at a LAN hub, not a tunnel or public proxy. */
export function isLocalUrl(url: string): boolean {
  const origin = parseOrigin(url);
  return origin !== null && isLocalHost(origin.host);
}

export function trimTrailingSlash(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
