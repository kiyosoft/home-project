import type { NetInfoState } from "@react-native-community/netinfo";
import { useEffect } from "react";
import { AppState } from "react-native";

import NetInfo from "@/lib/netinfo";
import { orderedCandidates } from "@/lib/select-url";
import { useHaStore } from "@/store/ha-store";

/** A socket can look open after sleep while nothing is actually flowing. */
const PING_TIMEOUT_MS = 4000;
const NETWORK_SETTLE_MS = 800;

let inFlight: Promise<void> | null = null;

function reconnect(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = useHaStore
    .getState()
    .connect()
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function socketAnswers(): Promise<boolean> {
  try {
    await Promise.race([
      useHaStore.getState().ping(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("ping timed out")), PING_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function useConnectionWatch() {
  useEffect(() => {
    let networkKey = "";
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const onForeground = async (next: string) => {
      if (next !== "active") return;
      const { mode, status } = useHaStore.getState();
      if (mode !== "live") return;
      if (status === "connecting") return;

      if (status === "connected") {
        if (await socketAnswers()) return;
        if (await sameAddressStillWins()) {
          if (useHaStore.getState().forceReconnect()) return;
        }
      }

      void reconnect();
    };

    const onNetwork = (state: NetInfoState) => {
      const key = `${state.type}:${state.isConnected}:${
        state.type === "wifi" ? (state.details?.ssid ?? "") : ""
      }`;
      if (key === networkKey) return;
      networkKey = key;

      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        void decideOnNetwork(state);
      }, NETWORK_SETTLE_MS);
    };

    const appState = AppState.addEventListener("change", (next) => {
      void onForeground(next);
    });
    const unsubscribeNet = NetInfo.addEventListener(onNetwork);

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      appState.remove();
      unsubscribeNet();
    };
  }, []);
}

async function sameAddressStillWins(): Promise<boolean> {
  const { activeUrl, profile } = useHaStore.getState();
  const candidates = await orderedCandidates(profile);
  return candidates[0]?.url === activeUrl;
}

async function decideOnNetwork(state: NetInfoState) {
  const { mode, status } = useHaStore.getState();
  if (mode !== "live") return;
  if (!state.isConnected) return;
  if (status === "connecting") return;

  if (status !== "connected") {
    void reconnect();
    return;
  }

  if (!(await sameAddressStillWins())) void reconnect();
}
