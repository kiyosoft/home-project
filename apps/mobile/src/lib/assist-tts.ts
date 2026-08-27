import { carriesCredential, resolveAssistMediaUrl, signPath } from "@ethio/ha-sdk";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

const SIGNATURE_TTL_SECONDS = 300;

let current: AudioPlayer | null = null;

export function stopAssistTts(): void {
  if (!current) return;
  const player = current;
  current = null;
  try {
    player.remove();
  } catch {
    // Already released by a previous teardown.
  }
}

export function playAssistTts(url: string): void {
  stopAssistTts();
  const player = createAudioPlayer(url);
  current = player;
  player.play();
}

/**
 * Turn the `tts-end` URL into something playable. Unlike the web dashboard,
 * which appends a long-lived token, mobile is usually signed in over OAuth and
 * has no such token to hand — so relative hub paths get signed over the socket
 * instead, the same way camera and media art are handled.
 */
export async function assistTtsPlaybackUrl(
  baseUrl: string,
  rawUrl: string,
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
): Promise<string | null> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const absolute =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:");
  if (absolute) return trimmed;

  const base = baseUrl.replace(/\/+$/, "");
  if (!base) return null;

  const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (carriesCredential(relative)) {
    return resolveAssistMediaUrl(base, relative);
  }

  try {
    const signed = await signPath(
      sendMessagePromise,
      relative,
      SIGNATURE_TTL_SECONDS,
    );
    return `${base}${signed}`;
  } catch {
    // An unsigned URL still plays when the hub allows unauthenticated media.
    return `${base}${relative}`;
  }
}
