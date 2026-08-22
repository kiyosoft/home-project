import type { EntityClient } from "./types";

export const ASSIST_SAMPLE_RATE = 16000;

export type AssistRunInput =
  | { kind: "wake"; sampleRate: number; timeoutSec?: number }
  | { kind: "voice"; sampleRate: number }
  | { kind: "text"; text: string };

export type AssistPipelineEvent =
  | { type: "run-start"; sttHandlerId: number | null }
  | { type: "run-end" }
  | { type: "wake-start" }
  | { type: "wake-end"; phrase: string | null }
  | { type: "stt-start" }
  | { type: "stt-end"; text: string }
  | { type: "intent-end"; speech: string; conversationId: string | null }
  | { type: "tts-end"; url: string }
  | { type: "error"; code: string; message: string };

export type AssistClient = Pick<EntityClient, "subscribeMessage" | "sendBinary">;

export interface StartAssistRunOptions {
  client: AssistClient;
  input: AssistRunInput;
  conversationId?: string;
  onEvent: (event: AssistPipelineEvent) => void;
}

export interface AssistRunHandle {
  sendAudio: (pcm: Uint8Array) => void;
  endAudio: () => void;
  close: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asHandlerId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  return null;
}

function readNested(
  value: unknown,
  path: readonly string[],
): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

export function parseAssistPipelineEvent(
  raw: unknown,
): AssistPipelineEvent | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;
  const data = isRecord(raw.data) ? raw.data : {};

  switch (raw.type) {
    case "run-start": {
      const runner = isRecord(data.runner_data) ? data.runner_data : {};
      return {
        type: "run-start",
        sttHandlerId: asHandlerId(runner.stt_binary_handler_id),
      };
    }
    case "run-end":
      return { type: "run-end" };
    case "wake_word-start":
      return { type: "wake-start" };
    case "wake_word-end": {
      const phrase =
        asString(readNested(data, ["wake_word_output", "wake_word_phrase"])) ??
        asString(readNested(data, ["wake_word_output", "ww_id"])) ??
        null;
      return { type: "wake-end", phrase };
    }
    case "stt-start":
      return { type: "stt-start" };
    case "stt-end": {
      const text = asString(readNested(data, ["stt_output", "text"])) ?? "";
      return { type: "stt-end", text };
    }
    case "intent-end": {
      const speech =
        asString(
          readNested(data, ["intent_output", "response", "speech", "plain", "speech"]),
        ) ?? "";
      const conversationId =
        asString(readNested(data, ["intent_output", "conversation_id"])) ?? null;
      return { type: "intent-end", speech, conversationId };
    }
    case "tts-end": {
      const url = asString(readNested(data, ["tts_output", "url"]));
      if (!url) return null;
      return { type: "tts-end", url };
    }
    case "error": {
      return {
        type: "error",
        code: asString(data.code) ?? "unknown",
        message: asString(data.message) ?? "Assist pipeline failed",
      };
    }
    default:
      return null;
  }
}

export function prefixAssistAudio(
  handlerId: number,
  pcm: Uint8Array,
): Uint8Array {
  const framed = new Uint8Array(1 + pcm.byteLength);
  framed[0] = handlerId;
  framed.set(pcm, 1);
  return framed;
}

export function assistAudioEndFrame(handlerId: number): Uint8Array {
  return Uint8Array.of(handlerId);
}

export function resolveAssistMediaUrl(baseUrl: string, url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const base = baseUrl.replace(/\/+$/, "");
  if (!base) return trimmed;
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

function isAudioInput(input: AssistRunInput): boolean {
  return input.kind === "voice" || input.kind === "wake";
}

function buildRunMessage(
  input: AssistRunInput,
  conversationId?: string,
): Record<string, unknown> {
  const message: Record<string, unknown> = {
    type: "assist_pipeline/run",
    end_stage: "tts",
  };
  if (conversationId) message.conversation_id = conversationId;

  if (input.kind === "wake") {
    message.start_stage = "wake_word";
    message.timeout = 360;
    message.input = {
      sample_rate: input.sampleRate,
      timeout: input.timeoutSec ?? 300,
    };
    return message;
  }

  if (input.kind === "voice") {
    message.start_stage = "stt";
    message.input = { sample_rate: input.sampleRate };
    return message;
  }

  message.start_stage = "intent";
  message.input = { text: input.text };
  return message;
}

export async function preferredPipelineHasWakeWord(
  sendMessagePromise: <T = unknown>(
    message: Record<string, unknown>,
  ) => Promise<T>,
): Promise<boolean> {
  const result: unknown = await sendMessagePromise({
    type: "assist_pipeline/pipeline/list",
  });
  if (!isRecord(result) || !Array.isArray(result.pipelines)) return false;
  const preferredId =
    asString(result.preferred_pipeline) ?? asString(result.preferred);
  const pipelines = result.pipelines.filter(isRecord);
  const preferred =
    (preferredId
      ? pipelines.find((pipeline) => asString(pipeline.id) === preferredId)
      : undefined) ?? pipelines[0];
  if (!preferred) return false;
  return Boolean(
    asString(preferred.wake_word_entity) || asString(preferred.wake_word_id),
  );
}

export async function startAssistRun(
  options: StartAssistRunOptions,
): Promise<AssistRunHandle> {
  let handlerId: number | null = null;
  let ended = false;
  let endWhenReady = false;
  const pending: Uint8Array[] = [];
  let unsubscribe: (() => void) | undefined;

  const flushPending = () => {
    if (handlerId == null) return;
    for (const chunk of pending) {
      options.client.sendBinary(prefixAssistAudio(handlerId, chunk));
    }
    pending.length = 0;
    if (endWhenReady && !ended) {
      ended = true;
      options.client.sendBinary(assistAudioEndFrame(handlerId));
    }
  };

  unsubscribe = await options.client.subscribeMessage(
    buildRunMessage(options.input, options.conversationId),
    (raw) => {
      const event = parseAssistPipelineEvent(raw);
      if (!event) return;
      if (event.type === "run-start" && event.sttHandlerId != null) {
        handlerId = event.sttHandlerId;
        flushPending();
      }
      options.onEvent(event);
    },
  );

  return {
    sendAudio(pcm) {
      if (ended || !isAudioInput(options.input)) return;
      if (handlerId == null) {
        pending.push(pcm);
        return;
      }
      options.client.sendBinary(prefixAssistAudio(handlerId, pcm));
    },
    endAudio() {
      if (ended || !isAudioInput(options.input)) return;
      if (handlerId == null) {
        endWhenReady = true;
        return;
      }
      ended = true;
      options.client.sendBinary(assistAudioEndFrame(handlerId));
    },
    close() {
      if (!ended && handlerId != null && isAudioInput(options.input)) {
        try {
          options.client.sendBinary(assistAudioEndFrame(handlerId));
        } catch {
          // Socket may already be gone.
        }
      }
      ended = true;
      pending.length = 0;
      unsubscribe?.();
    },
  };
}
