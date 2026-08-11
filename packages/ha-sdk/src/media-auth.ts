/**
 * Append HA long-lived token (or camera access_token) to media URLs that need auth.
 * Absolute http(s) URLs that already carry a query token are left alone when
 * `preferExisting` is true.
 */
export function withAuthToken(
  url: string | null | undefined,
  token: string | null | undefined,
  options?: { preferExisting?: boolean },
): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (!token) return trimmed;

  if (options?.preferExisting !== false) {
    try {
      const parsed = new URL(
        trimmed,
        trimmed.startsWith("http") ? undefined : "http://local",
      );
      if (
        parsed.searchParams.has("authSig") ||
        parsed.searchParams.has("token")
      ) {
        return trimmed;
      }
    } catch {
      // fall through and append
    }
  }

  const separator = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${separator}token=${encodeURIComponent(token)}`;
}
