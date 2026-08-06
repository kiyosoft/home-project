import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface DetailModalContent {
  title: string;
  description?: string;
  body: ReactNode;
  className?: string;
}

export interface DetailModalApi {
  open: (content: DetailModalContent) => void;
  close: () => void;
}

interface DetailModalState {
  open: boolean;
  content: DetailModalContent | null;
}

const DetailModalContext = createContext<DetailModalApi | null>(null);
const DetailModalStateContext = createContext<DetailModalState | null>(null);

export function DetailModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DetailModalState>({
    open: false,
    content: null,
  });

  const open = useCallback((content: DetailModalContent) => {
    setState({ open: true, content });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const api = useMemo<DetailModalApi>(() => ({ open, close }), [open, close]);

  return (
    <DetailModalContext.Provider value={api}>
      <DetailModalStateContext.Provider value={state}>
        {children}
      </DetailModalStateContext.Provider>
    </DetailModalContext.Provider>
  );
}

/** Open/close the host detail modal from a widget or plugin. */
export function useDetailModal(): DetailModalApi {
  const api = useContext(DetailModalContext);
  if (!api) {
    throw new Error(
      "useDetailModal must be used within DetailModalProvider (dashboard host).",
    );
  }
  return api;
}

/** Host-only: read current detail modal state for rendering. */
export function useDetailModalState(): DetailModalState {
  const state = useContext(DetailModalStateContext);
  if (!state) {
    throw new Error(
      "useDetailModalState must be used within DetailModalProvider.",
    );
  }
  return state;
}
