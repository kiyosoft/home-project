import { readHomeNetworkVerdict } from "@/lib/home-network";
import type { ConnectionProfile } from "@/lib/settings";
import { legacyPortUrl, trimTrailingSlash } from "@/lib/url";

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
  if (!internal) return withPortFallback(external, "external");
  if (!external) return withPortFallback(internal, "internal");

  const internalFirst = await preferInternal(profile, internal);
  return internalFirst
    ? [
        ...withPortFallback(internal, "internal"),
        ...withPortFallback(external, "external"),
      ]
    : [
        ...withPortFallback(external, "external"),
        ...withPortFallback(internal, "internal"),
      ];
}

/**
 * A local address with no port could be either of Home Assistant's two
 * defaults, so try the modern one and fall through to the old one rather than
 * asking somebody to know which kind of install they are running.
 */
function withPortFallback(url: string, kind: UrlKind): UrlCandidate[] {
  const legacy = legacyPortUrl(url);
  return legacy ? [{ url, kind }, { url: legacy, kind }] : [{ url, kind }];
}

async function preferInternal(
  profile: ConnectionProfile,
  internal: string,
): Promise<boolean> {
  if (profile.prioritizeInternal) return true;

  const verdict = await readHomeNetworkVerdict(profile.homeNetworks);
  if (verdict === "home") return true;
  if (verdict === "away") return false;

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
