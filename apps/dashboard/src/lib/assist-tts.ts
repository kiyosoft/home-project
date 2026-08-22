import { resolveAssistMediaUrl, withAuthToken } from "@ethio/ha-sdk";

let current: HTMLAudioElement | null = null;

export function stopAssistTts(): void {
  if (!current) return;
  current.pause();
  current.removeAttribute("src");
  current.load();
  current = null;
}

export function playAssistTts(url: string): void {
  stopAssistTts();
  const audio = new Audio(url);
  current = audio;
  audio.addEventListener(
    "ended",
    () => {
      if (current === audio) current = null;
    },
    { once: true },
  );
  void audio.play().catch(() => {
    if (current === audio) current = null;
  });
}

export function assistTtsPlaybackUrl(
  baseUrl: string,
  rawUrl: string,
  token: string,
): string | null {
  const resolved = resolveAssistMediaUrl(baseUrl, rawUrl);
  return withAuthToken(resolved, token);
}
