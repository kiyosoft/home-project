import { ASSIST_SAMPLE_RATE } from "@ethio/ha-sdk";

export type AssistMicErrorCode =
  | "denied"
  | "insecure"
  | "unavailable"
  | "failed";

export class AssistMicError extends Error {
  readonly code: AssistMicErrorCode;

  constructor(code: AssistMicErrorCode, message: string) {
    super(message);
    this.name = "AssistMicError";
    this.code = code;
  }
}

export interface AssistMicSession {
  stop: () => void;
  setAutoStop: (enabled: boolean) => void;
}

interface StartAssistMicOptions {
  onPcm: (pcm: Uint8Array) => void;
  onAutoStop: () => void;
  autoStop?: boolean;
  silenceMs?: number;
  maxMs?: number;
}

const WORKLET_SOURCE = `
class AssistPcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) {
      this.port.postMessage(channel);
    }
    return true;
  }
}
registerProcessor("assist-pcm", AssistPcmProcessor);
`;

const FLUSH_SAMPLES = 2048;
const SPEECH_RMS = 0.018;
const MIN_SPEECH_MS = 220;

function classifyMicError(error: unknown): AssistMicError {
  if (error instanceof AssistMicError) return error;
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return new AssistMicError("denied", "Microphone permission denied");
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return new AssistMicError("unavailable", "No microphone found");
  }
  if (name === "SecurityError" || name === "NotSupportedError") {
    return new AssistMicError("insecure", "Microphone requires a secure context");
  }
  return new AssistMicError("failed", "Could not open the microphone");
}

function isInsecureContext(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

function floatToPcm16(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Int16Array {
  if (input.length === 0) return new Int16Array(0);

  const convert = (sample: number): number => {
    const clipped = Math.max(-1, Math.min(1, sample));
    return clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767);
  };

  if (inputRate === outputRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      out[i] = convert(input[i] ?? 0);
    }
    return out;
  }

  const ratio = inputRate / outputRate;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.min(Math.floor(src), input.length - 1);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = src - i0;
    const mixed = (input[i0] ?? 0) * (1 - frac) + (input[i1] ?? 0) * frac;
    out[i] = convert(mixed);
  }
  return out;
}

function pcmBytes(samples: Int16Array): Uint8Array {
  return new Uint8Array(
    samples.buffer.slice(
      samples.byteOffset,
      samples.byteOffset + samples.byteLength,
    ),
  );
}

function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i] ?? 0;
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

export async function startAssistMic(
  options: StartAssistMicOptions,
): Promise<AssistMicSession> {
  if (isInsecureContext()) {
    throw new AssistMicError(
      "insecure",
      "Microphone requires HTTPS or localhost",
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new AssistMicError("unavailable", "Microphone is not available");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    throw classifyMicError(error);
  }

  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const silenceMs = options.silenceMs ?? 1000;
  const maxMs = options.maxMs ?? 30_000;
  let autoStop = options.autoStop !== false;
  let windowStartedAt = performance.now();

  let stopped = false;
  let heardSpeech = false;
  let speechStartedAt = 0;
  let silentFor = 0;
  let lastTick = windowStartedAt;
  let pending = new Int16Array(0);

  const flush = (force: boolean) => {
    if (pending.length === 0) return;
    if (!force && pending.length < FLUSH_SAMPLES) return;
    options.onPcm(pcmBytes(pending));
    pending = new Int16Array(0);
  };

  const pushPcm = (next: Int16Array) => {
    if (next.length === 0) return;
    const merged = new Int16Array(pending.length + next.length);
    merged.set(pending);
    merged.set(next, pending.length);
    pending = merged;
    flush(false);
  };

  const handleFloat = (samples: Float32Array) => {
    if (stopped) return;
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;

    const level = rms(samples);
    if (level >= SPEECH_RMS) {
      if (!heardSpeech) speechStartedAt = now;
      heardSpeech = true;
      silentFor = 0;
    } else if (heardSpeech) {
      silentFor += dt;
    }

    pushPcm(floatToPcm16(samples, context.sampleRate, ASSIST_SAMPLE_RATE));

    if (!autoStop) return;

    const spokenLongEnough =
      heardSpeech && now - speechStartedAt >= MIN_SPEECH_MS;
    if (spokenLongEnough && silentFor >= silenceMs) {
      stop();
      options.onAutoStop();
      return;
    }
    if (now - windowStartedAt >= maxMs) {
      stop();
      options.onAutoStop();
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    flush(true);
    source.disconnect();
    for (const track of stream.getTracks()) {
      track.stop();
    }
    void context.close();
  };

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    if (context.audioWorklet) {
      const workletUrl = URL.createObjectURL(
        new Blob([WORKLET_SOURCE], { type: "application/javascript" }),
      );
      try {
        await context.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }
      const node = new AudioWorkletNode(context, "assist-pcm");
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        handleFloat(event.data);
      };
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(node);
      node.connect(gain);
      gain.connect(context.destination);
    } else {
      const bufferSize = 4096;
      const processor = context.createScriptProcessor(bufferSize, 1, 1);
      processor.onaudioprocess = (event) => {
        handleFloat(event.inputBuffer.getChannelData(0));
      };
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(processor);
      processor.connect(gain);
      gain.connect(context.destination);
    }
  } catch (error) {
    stop();
    throw classifyMicError(error);
  }

  return {
    stop,
    setAutoStop(enabled) {
      autoStop = enabled;
      if (!enabled) return;
      heardSpeech = false;
      silentFor = 0;
      speechStartedAt = 0;
      windowStartedAt = performance.now();
    },
  };
}
