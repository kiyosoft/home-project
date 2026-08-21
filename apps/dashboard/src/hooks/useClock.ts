import { useSyncExternalStore } from "react";

let now = new Date();
const listeners = new Set<() => void>();
let timeoutId: number | undefined;
let intervalId: number | undefined;

function emit() {
  now = new Date();
  for (const listener of listeners) listener();
}

function start() {
  const msToNextMinute = 60_000 - (Date.now() % 60_000);
  timeoutId = window.setTimeout(() => {
    emit();
    intervalId = window.setInterval(emit, 60_000);
  }, msToNextMinute);
}

function stop() {
  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
    timeoutId = undefined;
  }
  if (intervalId !== undefined) {
    window.clearInterval(intervalId);
    intervalId = undefined;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot() {
  return now;
}

/** Live header clock. Ticks on the minute; the header does not show seconds. */
export function useClock(): Date {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
