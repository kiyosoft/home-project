import { useCallback } from "react";

import { useHaStore } from "@/store/ha-store";

/**
 * A tile never awaits the round trip: it paints the optimistic value and lets
 * the next state push confirm. A rejected call just falls back to real state.
 */
export function useCallService() {
  const callService = useHaStore((state) => state.callService);
  return useCallback(
    (domain: string, service: string, data?: Record<string, unknown>) => {
      void callService(domain, service, data).catch(() => {});
    },
    [callService],
  );
}
