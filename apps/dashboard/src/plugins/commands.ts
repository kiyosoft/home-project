import type { DefinedCommand } from "@ethio/plugin-sdk";

const commands = new Map<string, DefinedCommand>();

export function registerCommand(command: DefinedCommand): void {
  if (commands.has(command.id)) {
    throw new Error(`Duplicate command id: ${command.id}`);
  }
  commands.set(command.id, command);
}

export function unregisterCommandsByPlugin(pluginId: string): void {
  for (const [id, command] of commands) {
    if (command.pluginId === pluginId) {
      commands.delete(id);
    }
  }
}

export function listCommands(): DefinedCommand[] {
  return [...commands.values()];
}

export function clearCommands(): void {
  commands.clear();
}
