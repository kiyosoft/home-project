import type { HassEntity } from "@ethio/ha-sdk";
import type { TileSize } from "@ethio/mobile-schema";
import type { ComponentType } from "react";

export interface WidgetBodyProps {
  config: Record<string, unknown>;
  size: TileSize;
}

export interface MobileWidgetDef {
  id: string;
  component: ComponentType<WidgetBodyProps>;
  defaultSize: TileSize;
  domains: string[];
  /** When set, this widget only claims entities it recognizes in a shared domain. */
  matches?: (entity: HassEntity) => boolean;
}

export function readString(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = config[key];
  return typeof value === "string" ? value : "";
}

/** Slider values are an array in range mode; every tile here uses one thumb. */
export function singleSliderValue(value: number | number[]): number {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
}
