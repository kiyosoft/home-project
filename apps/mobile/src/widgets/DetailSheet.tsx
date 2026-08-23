import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet } from "heroui-native";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { EntityDetailBody } from "@/widgets/EntityDetailBody";

export interface DetailSheetContent {
  title: string;
  description?: string;
  body: ReactNode;
}

interface DetailSheetApi {
  open: (content: DetailSheetContent) => void;
  openEntity: (entityId: string, title: string) => void;
  close: () => void;
}

const DetailSheetContext = createContext<DetailSheetApi | null>(null);

/**
 * One sheet for every tile. Widgets push a body into it instead of each
 * mounting its own modal, which keeps a single sheet animating at a time.
 */
export function DetailSheetProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<DetailSheetContent | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const api = useMemo<DetailSheetApi>(
    () => ({
      open(next) {
        setContent(next);
        setIsOpen(true);
      },
      openEntity(entityId, title) {
        setContent({ title, body: <EntityDetailBody entityId={entityId} /> });
        setIsOpen(true);
      },
      close() {
        setIsOpen(false);
      },
    }),
    [],
  );

  const onOpenChange = useCallback((next: boolean) => {
    setIsOpen(next);
    // Keep the body mounted through the close animation, then drop it.
    if (!next) setTimeout(() => setContent(null), 250);
  }, []);

  return (
    <DetailSheetContext.Provider value={api}>
      {children}
      <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={["55%", "90%"]}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheet.Title>{content?.title ?? ""}</BottomSheet.Title>
            {content?.description ? (
              <BottomSheet.Description>
                {content.description}
              </BottomSheet.Description>
            ) : null}
            <BottomSheetScrollView
              contentContainerClassName="gap-4 pt-4 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {content?.body}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </DetailSheetContext.Provider>
  );
}

export function useDetailSheet(): DetailSheetApi {
  const api = useContext(DetailSheetContext);
  if (!api) {
    throw new Error("useDetailSheet must be used inside DetailSheetProvider");
  }
  return api;
}
