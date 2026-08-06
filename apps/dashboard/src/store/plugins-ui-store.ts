import { create } from "zustand";

interface PluginsUiState {
  /** Bump to refresh picker / plugins panel after install/uninstall */
  revision: number;
  pluginsOpen: boolean;
  bump: () => void;
  openPlugins: () => void;
  closePlugins: () => void;
}

export const usePluginsUiStore = create<PluginsUiState>((set) => ({
  revision: 0,
  pluginsOpen: false,
  bump: () => set((state) => ({ revision: state.revision + 1 })),
  openPlugins: () => set({ pluginsOpen: true }),
  closePlugins: () => set({ pluginsOpen: false }),
}));
