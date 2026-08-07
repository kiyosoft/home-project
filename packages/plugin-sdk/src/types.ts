import type { ComponentType } from "react";
import type { ZodTypeAny } from "zod";

import type { HassEntities, HassEntity } from "@ethio/ha-sdk";

export type Capability = "entity.read" | "service.call";

export interface SizeHint {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetComponentProps {
  config: Record<string, unknown>;
  interactive?: boolean;
}

export interface DefinedWidget {
  id: string;
  name: string;
  description?: string;
  component: ComponentType<WidgetComponentProps>;
  configSchema: ZodTypeAny;
  defaultConfig: Record<string, unknown>;
  defaultSize: SizeHint;
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  entityDomains?: string[];
  capabilities: Capability[];
  settingsComponent?: ComponentType<{
    config: Record<string, unknown>;
    onChange: (config: Record<string, unknown>) => void;
  }>;
  /** Set by defineWidget when nested under a plugin */
  pluginId?: string;
}

export interface DefinedCommand {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  run: () => void | Promise<void>;
  capability?: Capability;
  pluginId?: string;
}

export interface DefinedPlugin {
  id: string;
  name: string;
  widgets?: DefinedWidget[];
  commands?: DefinedCommand[];
  services?: unknown[];
  settingsComponent?: ComponentType;
}

export interface PlatformBindings {
  getEntity: (entityId: string) => HassEntity | undefined;
  getEntities: () => HassEntities;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ) => Promise<void>;
  sendMessagePromise?: <T = unknown>(
    message: Record<string, unknown>,
  ) => Promise<T>;
  /** HA base URL for resolving relative entity_picture paths */
  getBaseUrl?: () => string;
  /** Current plugin id for capability checks during hook use */
  getActivePluginId?: () => string | null;
  hasCapability?: (pluginId: string, capability: Capability) => boolean;
}

export interface RegisteredWidget extends DefinedWidget {
  type: string;
  pluginId: string;
}
