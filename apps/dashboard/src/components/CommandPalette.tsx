import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";

import { listCommands } from "@/plugins/commands";
import { createPageCommands } from "@/plugins/platform-commands";
import { useDashboardStore } from "@/store/dashboard-store";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const dashboard = useDashboardStore((state) => state.dashboard);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commands = useMemo(() => {
    if (!open) return [];
    return [...listCommands(), ...createPageCommands()];
  }, [open, dashboard]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/45"
        onClick={() => setOpen(false)}
      />
      <div className="absolute left-1/2 top-[18%] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2">
        <Command
          label="Command palette"
          className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          shouldFilter
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <Command.Input
            autoFocus
            placeholder="Type a command…"
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching commands
            </Command.Empty>
            <Command.Group heading="Commands" className="px-1 py-1">
              {commands.map((command) => (
                <Command.Item
                  key={command.id}
                  value={`${command.title} ${command.subtitle ?? ""} ${(command.keywords ?? []).join(" ")}`}
                  className="flex cursor-pointer flex-col rounded-xl px-3 py-2 data-[selected=true]:bg-muted"
                  onSelect={() => {
                    setOpen(false);
                    void Promise.resolve(command.run());
                  }}
                >
                  <span className="text-sm font-medium">{command.title}</span>
                  {command.subtitle ? (
                    <span className="text-xs text-muted-foreground">
                      {command.subtitle}
                    </span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
