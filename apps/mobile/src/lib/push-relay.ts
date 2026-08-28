import type { HassEntities } from "@ethio/ha-sdk";

/**
 * Finding the push relay that delivers notifications while the app is closed.
 *
 * Home Assistant needs a `push_url` to POST to, and only the Et Remote Access
 * add-on knows its own address: a host-network add-on has no DNS name, and
 * Home Assistant does not let us read add-on details over its Supervisor proxy.
 * So the relay publishes the address itself as an entity, which arrives on the
 * entity subscription we already hold.
 */

export const PUSH_RELAY_ENTITY_ID = "sensor.ethio_home_push_relay";

/** The relay saw Expo reject a token, so that one has to be replaced. */
const STATE_TOKEN_INVALID = "token_invalid";

/**
 * How much of a token the relay publishes to say which one it means. Must match
 * `FINGERPRINT_CHARS` in the add-on's `push_relay.py`; the token itself cannot
 * go on an entity every signed-in user can read.
 */
const FINGERPRINT_CHARS = 8;

export interface PushRelay {
  url: string;
  /**
   * Fingerprints of the tokens Expo has rejected, or `null` from a relay too
   * old to say which device it means. Read through {@link isTokenRejected}
   * rather than directly.
   */
  rejectedTokens: string[] | null;
}

export function readPushRelay(entities: HassEntities): PushRelay | null {
  const entity = entities[PUSH_RELAY_ENTITY_ID];
  if (!entity) return null;

  const url = entity.attributes?.push_url;
  if (typeof url !== "string") return null;

  const trimmed = url.trim();
  // Home Assistant validates `push_url` with `cv.url` and rejects the whole
  // registration if it does not parse, which would also drop the local channel.
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;

  const listed = entity.attributes?.invalid_push_tokens;
  const rejectedTokens = Array.isArray(listed)
    ? listed.filter((value): value is string => typeof value === "string")
    : // An older relay reports one flag for every device. Reading it as being
      // about ours is what the app used to do, and resending a token that did
      // not need it costs a round trip, where ignoring the warning would leave
      // a genuinely dead token in place for good.
      entity.state === STATE_TOKEN_INVALID
      ? null
      : [];

  return { url: trimmed, rejectedTokens };
}

/**
 * Whether the relay is complaining about this exact token.
 *
 * Keyed on the token rather than the device so it clears itself: once a fresh
 * token is registered the old fingerprint no longer matches, and the app stops
 * being told to replace something it already replaced.
 */
export function isTokenRejected(
  relay: PushRelay | null,
  pushToken: string | null | undefined,
): boolean {
  if (!relay) return false;
  // Null means the relay cannot be more specific, so it is about us or nobody.
  if (relay.rejectedTokens === null) return true;
  if (!pushToken) return false;
  return relay.rejectedTokens.includes(fingerprint(pushToken));
}

function fingerprint(token: string): string {
  return token.trim().slice(-FINGERPRINT_CHARS);
}
