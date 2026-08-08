import cheerUrl from "../assets/goal-cheer.mp3?url";

/** Mixkit “Huge crowd cheering victory” — free under the Mixkit License. */
const CHEER_VOLUME = 0.55;

let activeAudio: HTMLAudioElement | null = null;

/** Best-effort crowd cheer. Autoplay may be blocked until a user gesture. */
export function playCelebrationSound(): void {
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }

    const audio = new Audio(cheerUrl);
    audio.volume = CHEER_VOLUME;
    activeAudio = audio;

    const clear = () => {
      if (activeAudio === audio) activeAudio = null;
    };
    audio.addEventListener("ended", clear, { once: true });
    audio.addEventListener("error", clear, { once: true });

    void audio.play().catch(() => {
      clear();
    });
  } catch {
    // Autoplay / decode failures are silent by design.
  }
}

export function stopCelebrationSound(): void {
  if (!activeAudio) return;
  try {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  } catch {
    // ignore
  }
  activeAudio = null;
}
