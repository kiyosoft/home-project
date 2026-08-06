import type {
  DefinedCommand,
  DefinedPlugin,
  DefinedWidget,
} from "./types";

export function defineWidget(widget: DefinedWidget): DefinedWidget {
  if (!widget.id) throw new Error("defineWidget requires id");
  if (!widget.capabilities?.length) {
    throw new Error(`Widget ${widget.id} must declare capabilities`);
  }
  return widget;
}

export function defineCommand(command: DefinedCommand): DefinedCommand {
  if (!command.id) throw new Error("defineCommand requires id");
  return command;
}

export function definePlugin(plugin: DefinedPlugin): DefinedPlugin {
  if (!plugin.id) throw new Error("definePlugin requires id");
  if (!plugin.id.includes("/")) {
    // allow @scope/name
  }
  const widgets = (plugin.widgets ?? []).map((widget) => ({
    ...widget,
    pluginId: plugin.id,
  }));
  const commands = (plugin.commands ?? []).map((command) => ({
    ...command,
    pluginId: plugin.id,
  }));
  return { ...plugin, widgets, commands };
}
