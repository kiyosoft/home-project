import { readHomeNetworkVerdict } from "@/lib/home-network";
import type { ConnectionProfile } from "@/lib/settings";
import { trimTrailingSlash } from "@/lib/url";

/** Unauthenticated; any HTTP response means something is listening. */
const PROBE_PATH = "/manifest.json";
const PROBE_TIMEOUT_MS = 1200;

export type UrlKind = "internal" | "external";

export interface UrlCandidate {
  url: string;
  kind: UrlKind;
}

export async function orderedCandidates(
  profile: ConnectionProfile,
): Promise<UrlCandidate[]> {
  const internal = trimTrailingSlash(profile.internalUrl);
  const external = trimTrailingSlash(profile.externalUrl);

  if (!internal && !external) return [];
  if (!internal) return [{ url: external, kind: "external" }];
  if (!external) return [{ url: internal, kind: "internal" }];

  return (await preferInternal(profile, internal))
    ? [
        { url: internal, kind: "internal" },
        { url: external, kind: "external" },
      ]
    : [
        { url: external, kind: "external" },
        { url: internal, kind: "internal" },
      ];
}

async function preferInternal(
  profile: ConnectionProfile,
  internal: string,
): Promise<boolean> {
  if (profile.prioritizeInternal) return true;

  const verdict = await readHomeNetworkVerdict(profile);
  if (verdict === "home") return true;
  if (verdict === "away") return false;

  // Only reached when the OS would not name the network, so this probe is a
  // tiebreaker rather than something every launch pays for.
  return reachable(internal);
}

async function reachable(baseUrl: string): Promise<boolean> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${baseUrl}${PROBE_PATH}`, { signal: abort.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
