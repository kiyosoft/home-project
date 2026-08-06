export { defineCommand, definePlugin, defineWidget } from "./define";
export {
  createPlatformBindings,
  getPlatformBindings,
  runWithPluginContext,
  setActivePluginId,
} from "./bindings";
export { PluginScope, usePluginId } from "./context";
export {
  DetailModalProvider,
  useDetailModal,
  useDetailModalState,
} from "./detail-modal";
export type { DetailModalApi, DetailModalContent } from "./detail-modal";
export {
  EntityDetailProvider,
  useEntityDetail,
  useEntityDetailState,
} from "./entity-detail";
export type { EntityDetailApi } from "./entity-detail";
export {
  callServiceAsPlugin,
  notifyEntityStoreChanged,
  useCallService,
  useEntities,
  useEntity,
} from "./hooks";
export type {
  Capability,
  DefinedCommand,
  DefinedPlugin,
  DefinedWidget,
  PlatformBindings,
  RegisteredWidget,
  SizeHint,
  WidgetComponentProps,
} from "./types";
