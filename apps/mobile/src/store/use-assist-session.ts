import {
  ASSIST_SAMPLE_RATE,
  preferredPipelineHasWakeWord,
  startAssistRun,
  type AssistRunHandle,
} from "@ethio/ha-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  AssistMicError,
  useAssistMic,
  type AssistMicSession,
} from "@/lib/assist-audio";
import {
  assistTtsPlaybackUrl,
  playAssistTts,
  stopAssistTts,
} from "@/lib/assist-tts";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";

export type AssistBubble =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "error"; id: string; text: string };

export type AssistPhase = "idle" | "wake" | "listening" | "thinking";

function nextId(counter: { current: number }): string {
  counter.current += 1;
  return `assist-${counter.current}`;
}

/** A wake run that simply timed out is routine, not something to show the user. */
function isWakeTimeout(code: string): boolean {
  const lower = code.toLowerCase();
  return lower.includes("wake") && lower.includes("timeout");
}

export function useAssistSession() {
  const subscribeMessage = useHaStore((state) => state.subscribeMessage);
  const sendMessagePromise = useHaStore((state) => state.sendMessagePromise);
  const sendBinary = useHaStore((state) => state.sendBinary);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const t = useT();
  const mic = useAssistMic();

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
      void assistTtsPlaybackUrl(activeUrl, url, sendMessagePromise)
        .then((playback) => {
          if (playback && aliveRef.current) playAssistTts(playback);
        })
        .catch(() => {
          // A missing reply audio should not break the conversation.
        });
    },
    [activeUrl, sendMessagePromise],
  );

  const micErrorMessage = useCallback(
    (error: unknown) => {
      if (error instanceof AssistMicError) {
        if (error.code === "denied") return t("assist.errorMicDenied");
        if (error.code === "unavailable") {
          return t("assist.errorMicUnavailable");
        }
      }
      if (error instanceof Error && error.message) return error.message;
      return t("assist.errorGeneric");
    },
    [t],
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
      input:
        | { kind: "voice" }
        | { kind: "wake" }
        | { kind: "text"; text: string },
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
                push({
                  kind: "user",
                  id: nextId(idRef),
                  text: event.text.trim(),
                });
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
                text: event.speech.trim() || t("assist.done"),
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
                  text: event.message || t("assist.errorGeneric"),
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
    [abortIo, playReply, push, resumeWake, sendBinary, subscribeMessage, t],
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
      // Wake runs stream continuously; the pipeline decides when the turn starts.
      const session = await mic.start({
        autoStop: false,
        onPcm: (pcm) => handle.sendAudio(pcm),
        onAutoStop: () => {
          micRef.current = null;
          handle.endAudio();
          if (phaseRef.current === "listening") setPhaseBoth("thinking");
        },
      });
      if (!aliveRef.current || !wakeEnabledRef.current) {
        session.stop();
        handle.close();
        return;
      }
      micRef.current = session;
    } catch (error) {
      abortIo();
      push({ kind: "error", id: nextId(idRef), text: micErrorMessage(error) });
      wakeEnabledRef.current = false;
      setWakeEnabled(false);
      setPhaseBoth("idle");
    }
  }, [abortIo, beginRun, mic, micErrorMessage, push]);

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
      if (!aliveRef.current) handle.close();
    } catch (error) {
      push({ kind: "error", id: nextId(idRef), text: micErrorMessage(error) });
      if (wakeEnabledRef.current) resumeWake();
      else setPhaseBoth("idle");
    }
  }, [beginRun, draft, micErrorMessage, push, resumeWake]);

  const stopListening = useCallback(
    (send: boolean) => {
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
    },
    [resumeWake],
  );

  const toggleMic = useCallback(async () => {
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
      const session = await mic.start({
        onPcm: (pcm) => handle.sendAudio(pcm),
        onAutoStop: () => {
          micRef.current = null;
          handle.endAudio();
          if (phaseRef.current === "listening") setPhaseBoth("thinking");
        },
      });
      if (!aliveRef.current) {
        session.stop();
        handle.close();
        return;
      }
      micRef.current = session;
    } catch (error) {
      abortIo();
      push({ kind: "error", id: nextId(idRef), text: micErrorMessage(error) });
      if (wakeEnabledRef.current) resumeWake();
      else setPhaseBoth("idle");
    }
  }, [abortIo, beginRun, mic, micErrorMessage, push, resumeWake, stopListening]);

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
    toggleMic,
    toggleWake,
  };
}
