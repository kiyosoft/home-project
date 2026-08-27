import { ASSIST_SAMPLE_RATE } from "@ethio/ha-sdk";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
  type AudioStream,
  type AudioStreamBuffer,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

export type AssistMicErrorCode = "denied" | "unavailable" | "failed";

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

export interface StartAssistMicOptions {
  onPcm: (pcm: Uint8Array) => void;
  onAutoStop: () => void;
  autoStop?: boolean;
  silenceMs?: number;
  maxMs?: number;
}

/** Below this normalised RMS a buffer counts as silence. */
const SPEECH_RMS = 0.018;
/** Ignore silence until the speaker has been going this long, so a cough cannot end the turn. */
const MIN_SPEECH_MS = 220;
/** Batch this many samples before hitting the socket, to avoid a frame per callback. */
const FLUSH_SAMPLES = 2048;

interface MicRun {
  options: StartAssistMicOptions;
  autoStop: boolean;
  silenceMs: number;
  maxMs: number;
  stopped: boolean;
  heardSpeech: boolean;
  spokenMs: number;
  silentMs: number;
  elapsedMs: number;
  pending: Int16Array;
}

/**
 * Collapse interleaved multi-channel audio to mono. We ask for one channel but
 * the hardware is free to hand back more.
 */
function toMono(samples: Int16Array, channels: number): Int16Array {
  if (channels <= 1) return samples;
  const frames = Math.floor(samples.length / channels);
  const mono = new Int16Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) {
      sum += samples[frame * channels + channel] ?? 0;
    }
    mono[frame] = Math.round(sum / channels);
  }
  return mono;
}

/**
 * `sampleRate` on the buffer is what the hardware actually delivered, which is
 * often 44.1k or 48k even though we asked for 16k. Home Assistant is told the
 * rate up front and cannot renegotiate, so the resample has to happen here.
 */
function resample(
  samples: Int16Array,
  inputRate: number,
  outputRate: number,
): Int16Array {
  if (samples.length === 0 || inputRate === outputRate) return samples;

  const ratio = inputRate / outputRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const source = i * ratio;
    const low = Math.min(Math.floor(source), samples.length - 1);
    const high = Math.min(low + 1, samples.length - 1);
    const fraction = source - low;
    const mixed =
      (samples[low] ?? 0) * (1 - fraction) + (samples[high] ?? 0) * fraction;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(mixed)));
  }
  return out;
}

function rms(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = (samples[i] ?? 0) / 32768;
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

function pcmBytes(samples: Int16Array): Uint8Array {
  return new Uint8Array(
    samples.buffer.slice(
      samples.byteOffset,
      samples.byteOffset + samples.byteLength,
    ),
  );
}

function flush(run: MicRun, force: boolean) {
  if (run.pending.length === 0) return;
  if (!force && run.pending.length < FLUSH_SAMPLES) return;
  run.options.onPcm(pcmBytes(run.pending));
  run.pending = new Int16Array(0);
}

function append(run: MicRun, next: Int16Array) {
  if (next.length === 0) return;
  const merged = new Int16Array(run.pending.length + next.length);
  merged.set(run.pending);
  merged.set(next, run.pending.length);
  run.pending = merged;
  flush(run, false);
}

export interface AssistMic {
  start: (options: StartAssistMicOptions) => Promise<AssistMicSession>;
  stop: () => void;
}

/**
 * Streams microphone audio as the 16 kHz mono PCM16 that the Home Assistant
 * assist pipeline expects, and ends the turn on its own once the speaker has
 * stopped talking.
 */
export function useAssistMic(): AssistMic {
  const runRef = useRef<MicRun | null>(null);
  const startedRef = useRef(false);
  const streamRef = useRef<AudioStream | null>(null);

  const stopRun = useCallback(() => {
    const run = runRef.current;
    if (run && !run.stopped) {
      run.stopped = true;
      flush(run, true);
    }
    runRef.current = null;
    if (startedRef.current) {
      startedRef.current = false;
      streamRef.current?.stop();
    }
  }, []);

  const { stream } = useAudioStream({
    sampleRate: ASSIST_SAMPLE_RATE,
    channels: 1,
    encoding: "int16",
    onBuffer: (buffer: AudioStreamBuffer) => {
      const run = runRef.current;
      if (!run || run.stopped) return;

      const mono = toMono(new Int16Array(buffer.data), buffer.channels);
      const durationMs = (mono.length / buffer.sampleRate) * 1000;
      run.elapsedMs += durationMs;

      if (rms(mono) >= SPEECH_RMS) {
        run.heardSpeech = true;
        run.spokenMs += durationMs;
        run.silentMs = 0;
      } else if (run.heardSpeech) {
        run.silentMs += durationMs;
      }

      append(run, resample(mono, buffer.sampleRate, ASSIST_SAMPLE_RATE));

      if (!run.autoStop) return;

      const spokenLongEnough = run.heardSpeech && run.spokenMs >= MIN_SPEECH_MS;
      if (
        (spokenLongEnough && run.silentMs >= run.silenceMs) ||
        run.elapsedMs >= run.maxMs
      ) {
        stopRun();
        run.options.onAutoStop();
      }
    },
  });

  streamRef.current = stream;

  useEffect(() => stopRun, [stopRun]);

  const start = useCallback(
    async (options: StartAssistMicOptions): Promise<AssistMicSession> => {
      stopRun();

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new AssistMicError(
          permission.canAskAgain ? "denied" : "unavailable",
          "Microphone permission denied",
        );
      }

      // playsInSilentMode keeps the spoken reply audible with the ringer off.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      const run: MicRun = {
        options,
        autoStop: options.autoStop !== false,
        silenceMs: options.silenceMs ?? 1000,
        maxMs: options.maxMs ?? 30_000,
        stopped: false,
        heardSpeech: false,
        spokenMs: 0,
        silentMs: 0,
        elapsedMs: 0,
        pending: new Int16Array(0),
      };
      runRef.current = run;

      try {
        await stream.start();
        startedRef.current = true;
      } catch (error) {
        runRef.current = null;
        throw new AssistMicError(
          "failed",
          error instanceof Error ? error.message : "Could not open the microphone",
        );
      }

      return {
        stop: stopRun,
        setAutoStop(enabled) {
          run.autoStop = enabled;
          if (!enabled) return;
          // Restart the window so audio heard before the wake word fired does
          // not count towards ending this turn.
          run.heardSpeech = false;
          run.spokenMs = 0;
          run.silentMs = 0;
          run.elapsedMs = 0;
        },
      };
    },
    [stopRun, stream],
  );

  return { start, stop: stopRun };
}
