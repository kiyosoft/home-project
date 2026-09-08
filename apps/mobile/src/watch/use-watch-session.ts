import { useEffect, useMemo, useRef } from "react";

import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";

import { buildWatchCatalog, buildWatchSnapshot, defaultWatchEntityIds } from "./catalog";
import { dispatchWatchCommand, dispatchWatchToggle, parseWatchCommand } from "./dispatch";
import { fireWatchGesture } from "./fire-gesture";
import {
  EthioWatch,
  getWatchStatus,
  sendWatchResult,
  setWatchAtHome,
  syncWatchCatalog,
  syncWatchSnapshot,
} from "./native";
import { loadAtHome, saveAtHome, saveWatchAreaId } from "./settings";
import { useWatchStore } from "./watch-store";

const SNAPSHOT_MS = 300;
const EMPTY_FAVORITES: string[] = [];

export function useWatchSession(): void {
  const mode = useHaStore((state) => state.mode);
  const status = useHaStore((state) => state.status);
  const entities = useHaStore((state) => state.entities);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);
  const document = useDashboardStore((state) => state.document);
  const selectedIds = useWatchStore((state) => state.entityIds);
  const atHome = useWatchStore((state) => state.atHome);
  const currentAreaId = useWatchStore((state) => state.currentAreaId);
  const hydrate = useWatchStore((state) => state.hydrate);
  const setStatus = useWatchStore((state) => state.setStatus);
  const setModel = useWatchStore((state) => state.setModel);
  const setArea = useWatchStore((state) => state.setArea);
  const setAtHome = useWatchStore((state) => state.setAtHome);

  const resolvedIds = useMemo(() => {
    if (selectedIds !== null) return selectedIds;
    return defaultWatchEntityIds(document, entities);
  }, [document, entities, selectedIds]);

  const favoriteIds = document?.favorites ?? EMPTY_FAVORITES;
  const connected = mode === "demo" || status === "connected";

  const catalog = useMemo(
    () =>
      buildWatchCatalog({
        entities,
        areas,
        areaByEntity,
        selectedIds: resolvedIds,
        favoriteIds,
        atHome,
        currentAreaId,
      }),
    [
      areaByEntity,
      areas,
      atHome,
      currentAreaId,
      entities,
      favoriteIds,
      resolvedIds,
    ],
  );

  const snapshot = useMemo(
    () =>
      buildWatchSnapshot({
        entities,
        catalog,
        atHome,
        connected,
      }),
    [atHome, catalog, connected, entities],
  );

  const catalogKey = useRef("");
  const snapshotKey = useRef("");
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!EthioWatch) return;
    setStatus(getWatchStatus());
    const toggle = EthioWatch.addListener("onToggle", (event) => {
      void dispatchWatchToggle(event.entityId).then((result) => {
        sendWatchResult(result);
      });
    });
    const command = EthioWatch.addListener("onCommand", (event) => {
      const parsed = parseWatchCommand(event);
      if (!parsed) return;
      void dispatchWatchCommand(parsed).then((result) => {
        sendWatchResult(result);
      });
    });
    const gesture = EthioWatch.addListener("onGesture", (event) => {
      const store = useWatchStore.getState();
      void fireWatchGesture({
        gesture: event.gesture,
        atHome: store.atHome,
        areaId: store.currentAreaId,
      }).then((result) => {
        sendWatchResult(result);
      });
    });
    const model = EthioWatch.addListener("onModel", (event) => {
      setModel(event.devices ?? []);
    });
    const watchStatus = EthioWatch.addListener("onStatus", (next) => {
      setStatus(next);
      if (typeof next.atHome === "boolean") {
        void saveAtHome(next.atHome);
      }
      if (next.currentAreaId) {
        setArea(next.currentAreaId);
        void saveWatchAreaId(next.currentAreaId);
      }
    });
    return () => {
      toggle.remove();
      command.remove();
      gesture.remove();
      model.remove();
      watchStatus.remove();
    };
  }, [setArea, setModel, setStatus]);

  useEffect(() => {
    if (mode === "demo") {
      setAtHome(true);
      setWatchAtHome(true);
      return;
    }
    void loadAtHome().then((saved) => {
      if (saved === null) return;
      setAtHome(saved);
      setWatchAtHome(saved);
    });
  }, [mode, setAtHome]);

  useEffect(() => {
    if (!EthioWatch) return;
    const key = JSON.stringify(catalog);
    if (key === catalogKey.current) return;
    catalogKey.current = key;
    syncWatchCatalog(catalog);
  }, [catalog]);

  useEffect(() => {
    if (!EthioWatch) return;
    const key = JSON.stringify(snapshot);
    if (key === snapshotKey.current) return;
    if (!snapshotKey.current) {
      snapshotKey.current = key;
      syncWatchSnapshot(snapshot);
      return;
    }
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => {
      snapshotKey.current = key;
      syncWatchSnapshot(snapshot);
      snapshotTimer.current = null;
    }, SNAPSHOT_MS);
    return () => {
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    };
  }, [snapshot]);
}
