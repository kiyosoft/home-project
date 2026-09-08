import { NativeModule, requireOptionalNativeModule } from "expo";

export interface WatchNativeStatus {
  available: boolean;
  paired: boolean;
  appInstalled: boolean;
  reachable: boolean;
  activated: boolean;
  hasCompass: boolean;
  currentAreaId: string;
  paintingEntityId: string;
  atHome?: boolean;
}

export interface WatchCatalogArea {
  id: string;
  name: string;
}

export interface WatchCatalogEntity {
  id: string;
  name: string;
  areaId: string;
  domain: string;
}

export interface WatchCatalog {
  areas: WatchCatalogArea[];
  entities: WatchCatalogEntity[];
  atHome: boolean;
  currentAreaId: string;
}

export interface WatchModelDevice {
  entityId: string;
  areaId: string;
  painted: boolean;
  contested: boolean;
}

export interface WatchModelEvent {
  devices?: WatchModelDevice[];
}

type WatchEvents = {
  onToggle: (event: { entityId: string }) => void;
  onModel: (event: WatchModelEvent) => void;
  onStatus: (event: WatchNativeStatus) => void;
};

declare class EthioWatchModule extends NativeModule<WatchEvents> {
  getStatus(): WatchNativeStatus;
  syncCatalog(catalog: WatchCatalog): void;
  startPaint(entityId: string): void;
  setAtHome(atHome: boolean): void;
  setArea(areaId: string): void;
  clearPaint(entityId: string): void;
}

export const EthioWatch =
  requireOptionalNativeModule<EthioWatchModule>("EthioWatch");

export const EMPTY_WATCH_STATUS: WatchNativeStatus = {
  available: false,
  paired: false,
  appInstalled: false,
  reachable: false,
  activated: false,
  hasCompass: false,
  currentAreaId: "",
  paintingEntityId: "",
};

export function getWatchStatus(): WatchNativeStatus {
  return EthioWatch?.getStatus() ?? EMPTY_WATCH_STATUS;
}

export function syncWatchCatalog(catalog: WatchCatalog): void {
  EthioWatch?.syncCatalog(catalog);
}

export function startWatchPaint(entityId: string): void {
  EthioWatch?.startPaint(entityId);
}

export function setWatchAtHome(atHome: boolean): void {
  EthioWatch?.setAtHome(atHome);
}

export function setWatchArea(areaId: string): void {
  EthioWatch?.setArea(areaId);
}

export function clearWatchPaint(entityId: string): void {
  EthioWatch?.clearPaint(entityId);
}
