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

export async function executeCommand(id: string): Promise<void> {
  const command = commands.get(id);
  if (!command) {
    throw new Error(`Unknown command: ${id}`);
  }
  await command.run();
}

export function clearCommands(): void {
  commands.clear();
}
