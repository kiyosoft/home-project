import { corePlugin } from "@ethio/core";
import { sinksarPlugin } from "@ethio/sinksar";
import { teamtrackerPlugin } from "@ethio/teamtracker";

import { registerCommand } from "./commands";
import { exposeHostGlobals } from "./host-globals";
import { loadPlugins } from "./manager";
import { createPlatformCommands } from "./platform-commands";
import { wirePlatformBindings } from "./platform-bindings";
import { loadInstalledRemotePlugins } from "./remote-plugins";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

/** Load official plugins, host globals, then installed remote plugins. */
export function bootstrapPlugins(): Promise<void> {
  if (bootstrapped) return Promise.resolve();
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    exposeHostGlobals();
    wirePlatformBindings();
    loadPlugins([corePlugin, teamtrackerPlugin, sinksarPlugin]);

    for (const command of createPlatformCommands()) {
      registerCommand(command);
    }

    await loadInstalledRemotePlugins();
    bootstrapped = true;
  })();

  return bootstrapPromise;
}
