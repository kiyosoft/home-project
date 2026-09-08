import { useEffect, useMemo } from "react";

import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";

import { buildWatchCatalog, defaultWatchEntityIds } from "./catalog";
import { dispatchWatchToggle } from "./dispatch";
import {
  EthioWatch,
  getWatchStatus,
  setWatchAtHome,
  syncWatchCatalog,
} from "./native";
import { loadAtHome, saveAtHome, saveWatchAreaId } from "./settings";
import { useWatchStore } from "./watch-store";

/**
 * Keeps the wrist catalog in step with HA and turns watch snaps into the same
 * service calls the Home Screen widgets already use.
 */
export function useWatchSession(): void {
  const mode = useHaStore((state) => state.mode);
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

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!EthioWatch) return;
    setStatus(getWatchStatus());
    const toggle = EthioWatch.addListener("onToggle", (event) => {
      dispatchWatchToggle(event.entityId);
    });
    const model = EthioWatch.addListener("onModel", (event) => {
      setModel(event.devices ?? []);
    });
    const status = EthioWatch.addListener("onStatus", (next) => {
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
      model.remove();
      status.remove();
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
    const catalog = buildWatchCatalog({
      entities,
      areas,
      areaByEntity,
      selectedIds: resolvedIds,
      atHome,
      currentAreaId,
    });
    syncWatchCatalog(catalog);
  }, [areaByEntity, areas, atHome, currentAreaId, entities, resolvedIds]);
}
