import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface EntityDetailApi {
  open: (entityId: string) => void;
  close: () => void;
}

interface EntityDetailState {
  entityId: string | null;
}

const EntityDetailContext = createContext<EntityDetailApi | null>(null);
const EntityDetailStateContext = createContext<EntityDetailState | null>(null);

export function EntityDetailProvider({ children }: { children: ReactNode }) {
  const [entityId, setEntityId] = useState<string | null>(null);

  const open = useCallback((id: string) => {
    if (!id.trim()) return;
    setEntityId(id.trim());
  }, []);

  const close = useCallback(() => {
    setEntityId(null);
  }, []);

  const api = useMemo<EntityDetailApi>(() => ({ open, close }), [open, close]);
  const state = useMemo<EntityDetailState>(() => ({ entityId }), [entityId]);

  return (
    <EntityDetailContext.Provider value={api}>
      <EntityDetailStateContext.Provider value={state}>
        {children}
      </EntityDetailStateContext.Provider>
    </EntityDetailContext.Provider>
  );
}

/** Open the host Tunet-style entity info sheet from a widget. */
export function useEntityDetail(): EntityDetailApi {
  const api = useContext(EntityDetailContext);
  if (!api) {
    throw new Error(
      "useEntityDetail must be used within EntityDetailProvider (dashboard host).",
    );
  }
  return api;
}

/** Host-only: current entity detail target. */
export function useEntityDetailState(): EntityDetailState {
  const state = useContext(EntityDetailStateContext);
  if (!state) {
    throw new Error(
      "useEntityDetailState must be used within EntityDetailProvider.",
    );
  }
  return state;
}
