import { createContext, useContext, type ReactNode } from "react";

const PluginIdContext = createContext<string | null>(null);

export function PluginScope({
  pluginId,
  children,
}: {
  pluginId: string;
  children: ReactNode;
}) {
  return (
    <PluginIdContext.Provider value={pluginId}>
      {children}
    </PluginIdContext.Provider>
  );
}

export function usePluginId(): string | null {
  return useContext(PluginIdContext);
}
