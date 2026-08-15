import { flattenPlayable, type MediaChoice } from "./media-utils";

export const RADIO_BROWSER_ROOT = "media-source://radio_browser";
export const RADIO_STATION_LIMIT = 40;

const LOCALE_COUNTRY: Record<string, string> = {
  am: "ET",
  "am-et": "ET",
};

interface BrowseNode {
  title?: string;
  media_content_type?: string;
  media_content_id?: string;
  can_play?: boolean;
  can_expand?: boolean;
  children?: BrowseNode[] | null;
}

function asNode(value: unknown): BrowseNode | null {
  if (!value || typeof value !== "object") return null;
  return value as BrowseNode;
}

function childrenOf(node: BrowseNode | null | undefined): BrowseNode[] {
  if (!Array.isArray(node?.children)) return [];
  return node.children.filter((child): child is BrowseNode =>
    Boolean(child && typeof child === "object"),
  );
}

function localeTag(): string {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== "undefined") return navigator.language;
  return "en";
}

export function preferredCountryCode(hassCountry?: string | null): string | undefined {
  const fromHass = hassCountry?.trim().toUpperCase();
  if (fromHass && /^[A-Z]{2}$/.test(fromHass)) return fromHass;

  for (const raw of [localeTag(), typeof navigator !== "undefined" ? navigator.language : ""]) {
    const lower = raw.trim().toLowerCase();
    if (!lower) continue;
    if (LOCALE_COUNTRY[lower]) return LOCALE_COUNTRY[lower];
    const region = lower.split(/[-_]/)[1];
    if (region && /^[a-z]{2}$/.test(region)) return region.toUpperCase();
  }
  return undefined;
}

export function countryDisplayName(code: string, locale = localeTag()): string {
  try {
    const name = new Intl.DisplayNames([locale, "en"], { type: "region" }).of(
      code,
    );
    if (name) return name;
  } catch {
    // Ignore missing Intl support.
  }
  return code;
}

function stationsFrom(node: BrowseNode | null, source: string): MediaChoice[] {
  return flattenPlayable(childrenOf(node), "music", source).slice(
    0,
    RADIO_STATION_LIMIT,
  );
}

function idEndsWith(node: BrowseNode, suffix: string): boolean {
  return String(node.media_content_id || "")
    .toLowerCase()
    .endsWith(suffix.toLowerCase());
}

export async function loadRadioBrowserStations(
  browseSource: (mediaContentId?: string) => Promise<unknown>,
  countryCode?: string,
): Promise<{ stations: MediaChoice[]; countryLabel: string }> {
  const browse = async (id?: string) => asNode(await browseSource(id));
  const countryLabel = countryCode ? countryDisplayName(countryCode) : "Radio";

  const directIds = [
    countryCode ? `${RADIO_BROWSER_ROOT}/country/${countryCode}` : "",
    `${RADIO_BROWSER_ROOT}/local`,
  ].filter(Boolean);

  for (const id of directIds) {
    try {
      const listing = await browse(id);
      const stations = stationsFrom(listing, "Radio Browser");
      if (stations.length > 0) {
        return {
          stations,
          countryLabel: id.endsWith("/local") ? "Local" : countryLabel,
        };
      }
    } catch {
      // Folder may be missing if Radio Browser is not installed.
    }
  }

  try {
    const root = await browse(RADIO_BROWSER_ROOT);
    const children = childrenOf(root);
    const countryNode = countryCode
      ? children.find(
          (child) =>
            idEndsWith(child, `/country/${countryCode}`) ||
            String(child.title || "").toLowerCase() ===
              countryLabel.toLowerCase(),
        )
      : undefined;
    const localNode = children.find((child) => idEndsWith(child, "/local"));
    const popularNode = children.find((child) =>
      idEndsWith(child, "/popular"),
    );
    const target = countryNode ?? localNode ?? popularNode;
    if (!target) return { stations: [], countryLabel };

    const listing =
      childrenOf(target).length > 0
        ? target
        : target.media_content_id
          ? await browse(target.media_content_id)
          : null;
    const stations = stationsFrom(listing, "Radio Browser");
    return {
      stations,
      countryLabel: countryNode?.title || (localNode ? "Local" : "Popular"),
    };
  } catch {
    return { stations: [], countryLabel };
  }
}
