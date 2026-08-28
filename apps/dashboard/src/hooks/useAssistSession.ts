import {
  ASSIST_SAMPLE_RATE,
  preferredPipelineHasWakeWord,
  startAssistRun,
  type AssistRunHandle,
} from "@ethio/ha-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { t } from "@/i18n";
import {
  AssistMicError,
  startAssistMic,
  type AssistMicSession,
} from "@/lib/assist-audio";
import { assistTtsPlaybackUrl, playAssistTts, stopAssistTts } from "@/lib/assist-tts";
import { liveAccessToken } from "@/lib/settings";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

export type AssistBubble =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "error"; id: string; text: string };

export type AssistPhase = "idle" | "wake" | "listening" | "thinking";

function nextId(counter: { current: number }): string {
  counter.current += 1;
  return `assist-${counter.current}`;
}

function isWakeTimeout(code: string): boolean {
  const lower = code.toLowerCase();
  return lower.includes("wake") && lower.includes("timeout");
}

export function useAssistSession() {
  const subscribeMessage = useHaStore((state) => state.subscribeMessage);
  const sendMessagePromise = useHaStore((state) => state.sendMessagePromise);
  const sendBinary = useHaStore((state) => state.sendBinary);
  const baseUrl = useHaStore((state) => state.baseUrl);
  const locale = useLocaleStore((state) => state.locale);

  const [messages, setMessages] = useState<AssistBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<AssistPhase>("idle");
  const [wakeAvailable, setWakeAvailable] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState(false);

  const runRef = useRef<AssistRunHandle | null>(null);
  const micRef = useRef<AssistMicSession | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const idRef = useRef(0);
  const phaseRef = useRef<AssistPhase>("idle");
  const aliveRef = useRef(true);
  const wakeEnabledRef = useRef(false);
  const startWakeRef = useRef<() => Promise<void>>(async () => {});

  const setPhaseBoth = (next: AssistPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const push = useCallback((bubble: AssistBubble) => {
    setMessages((current) => [...current, bubble]);
  }, []);

  const abortIo = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    runRef.current?.close();
    runRef.current = null;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortIo();
      stopAssistTts();
    };
  }, [abortIo]);

  const playReply = useCallback(
    (url: string) => {
      const playback = assistTtsPlaybackUrl(baseUrl, url, liveAccessToken());
      if (playback) playAssistTts(playback);
    },
    [baseUrl],
  );

  const micErrorMessage = useCallback(
    (error: unknown) => {
      if (error instanceof AssistMicError) {
        if (error.code === "denied") return t(locale, "assist.errorMicDenied");
        if (error.code === "insecure") return t(locale, "assist.errorMicInsecure");
        if (error.code === "unavailable") {
          return t(locale, "assist.errorMicUnavailable");
        }
      }
      if (error instanceof Error && error.message) return error.message;
      return t(locale, "assist.errorGeneric");
    },
    [locale],
  );

  const resumeWake = useCallback(() => {
    if (!aliveRef.current || !wakeEnabledRef.current) {
      setPhaseBoth("idle");
      return;
    }
    void startWakeRef.current();
  }, []);

  const beginRun = useCallback(
    async (
      input: { kind: "voice" } | { kind: "wake" } | { kind: "text"; text: string },
    ) => {
      stopAssistTts();
      abortIo();

      const handle = await startAssistRun({
        client: { subscribeMessage, sendBinary },
        input:
          input.kind === "text"
            ? { kind: "text", text: input.text }
            : input.kind === "wake"
              ? { kind: "wake", sampleRate: ASSIST_SAMPLE_RATE }
              : { kind: "voice", sampleRate: ASSIST_SAMPLE_RATE },
        conversationId: conversationIdRef.current ?? undefined,
        onEvent(event) {
          switch (event.type) {
            case "wake-start":
              setPhaseBoth("wake");
              break;
            case "wake-end":
              micRef.current?.setAutoStop(true);
              setPhaseBoth("listening");
              break;
            case "stt-start":
              micRef.current?.setAutoStop(true);
              if (phaseRef.current === "wake") setPhaseBoth("listening");
              break;
            case "stt-end":
              if (event.text.trim()) {
                push({ kind: "user", id: nextId(idRef), text: event.text.trim() });
              }
              setPhaseBoth("thinking");
              break;
            case "intent-end":
              if (event.conversationId) {
                conversationIdRef.current = event.conversationId;
              }
              push({
                kind: "assistant",
                id: nextId(idRef),
                text: event.speech.trim() || t(locale, "assist.done"),
              });
              break;
            case "tts-end":
              playReply(event.url);
              break;
            case "error":
              if (!isWakeTimeout(event.code)) {
                push({
                  kind: "error",
                  id: nextId(idRef),
                  text: event.message || t(locale, "assist.errorGeneric"),
                });
              }
              break;
            case "run-end":
              runRef.current = null;
              if (wakeEnabledRef.current) {
                resumeWake();
              } else {
                setPhaseBoth("idle");
              }
              break;
            case "run-start":
              break;
            default: {
              const _exhaustive: never = event;
              void _exhaustive;
              break;
            }
          }
        },
      });
      runRef.current = handle;
      return handle;
    },
    [abortIo, locale, playReply, push, sendBinary, subscribeMessage],
  );

  const startWakeListening = useCallback(async () => {
    if (!aliveRef.current || !wakeEnabledRef.current) return;
    setPhaseBoth("wake");
    try {
      const handle = await beginRun({ kind: "wake" });
      if (!aliveRef.current || !wakeEnabledRef.current) {
        handle.close();
        return;
      }
      const mic = await startAssistMic({
        autoStop: false,
        onPcm: (pcm) => handle.sendAudio(pcm),
        onAutoStop: () => {
          micRef.current = null;
          handle.endAudio();
          if (phaseRef.current === "listening") setPhaseBoth("thinking");
        },
      });
      if (!aliveRef.current || !wakeEnabledRef.current) {
        mic.stop();
        handle.close();
        return;
      }
      micRef.current = mic;
    } catch (error) {
      abortIo();
      push({ kind: "error", id: nextId(idRef), text: micErrorMessage(error) });
      wakeEnabledRef.current = false;
      setWakeEnabled(false);
      setPhaseBoth("idle");
    }
  }, [abortIo, beginRun, micErrorMessage, push]);

  startWakeRef.current = startWakeListening;

  useEffect(() => {
    let cancelled = false;
    void preferredPipelineHasWakeWord(sendMessagePromise)
      .then((hasWake) => {
        if (cancelled || !aliveRef.current) return;
        setWakeAvailable(hasWake);
        if (!hasWake) return;
        wakeEnabledRef.current = true;
        setWakeEnabled(true);
        void startWakeRef.current();
      })
      .catch(() => {
        if (!cancelled) setWakeAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sendMessagePromise]);

  const sendText = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    push({ kind: "user", id: nextId(idRef), text });
    setPhaseBoth("thinking");
    try {
      const handle = await beginRun({ kind: "text", text });
      if (!aliveRef.current) {
        handle.close();
      }
    } catch (error) {
      push({
        kind: "error",
        id: nextId(idRef),
        text: micErrorMessage(error),
      });
      if (wakeEnabledRef.current) resumeWake();
      else setPhaseBoth("idle");
    }
  }, [beginRun, draft, micErrorMessage, push, resumeWake]);

  const stopListening = useCallback((send: boolean) => {
    micRef.current?.stop();
    micRef.current = null;
    if (send) {
      runRef.current?.endAudio();
      setPhaseBoth("thinking");
      return;
    }
    runRef.current?.close();
    runRef.current = null;
    if (wakeEnabledRef.current) resumeWake();
    else setPhaseBoth("idle");
  }, [resumeWake]);

  const startListening = useCallback(async () => {
    if (phaseRef.current === "listening") {
      stopListening(true);
      return;
    }

    setPhaseBoth("listening");
    try {
      const handle = await beginRun({ kind: "voice" });
      if (!aliveRef.current) {
        handle.close();
        return;
      }
      const mic = await startAssistMic({
        onPcm: (pcm) => handle.sendAudio(pcm),
        onAutoStop: () => {
          micRef.current = null;
          handle.endAudio();
          if (phaseRef.current === "listening") setPhaseBoth("thinking");
        },
      });
      if (!aliveRef.current) {
        mic.stop();
        handle.close();
        return;
      }
      micRef.current = mic;
    } catch (error) {
      abortIo();
      push({ kind: "error", id: nextId(idRef), text: micErrorMessage(error) });
      if (wakeEnabledRef.current) resumeWake();
      else setPhaseBoth("idle");
    }
  }, [abortIo, beginRun, micErrorMessage, push, resumeWake, stopListening]);

  const toggleWake = useCallback(() => {
    if (!wakeAvailable) return;
    const next = !wakeEnabledRef.current;
    wakeEnabledRef.current = next;
    setWakeEnabled(next);
    if (next) {
      if (phaseRef.current === "idle") void startWakeListening();
      return;
    }
    if (phaseRef.current === "wake") {
      abortIo();
      setPhaseBoth("idle");
    }
  }, [abortIo, startWakeListening, wakeAvailable]);

  return {
    messages,
    draft,
    setDraft,
    phase,
    wakeAvailable,
    wakeEnabled,
    sendText,
    toggleMic: startListening,
    toggleWake,
  };
}
