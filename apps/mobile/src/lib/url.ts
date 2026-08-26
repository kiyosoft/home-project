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

export function trimTrailingSlash(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
