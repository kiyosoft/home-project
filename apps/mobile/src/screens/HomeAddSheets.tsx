import { SCENE_DOMAINS } from "@ethio/mobile-schema";

import { EntityPickerSheet } from "@/widgets/EntityPickerSheet";
import {
  AreaPickerSheet,
  WidgetTypeSheet,
  type AddTileChoice,
} from "@/widgets/AddTileSheet";

export type AddStep = "type" | "entity" | "area" | "scene";

export function HomeAddSheets({
  step,
  used,
  sceneOnly,
  onClose,
  onChooseType,
  onPickArea,
  onPickEntity,
}: {
  step: AddStep | null;
  used: Set<string>;
  sceneOnly: boolean;
  onClose: () => void;
  onChooseType: (choice: AddTileChoice) => void;
  onPickArea: (areaId: string, name: string) => void;
  onPickEntity: (entityId: string) => void;
}) {
  return (
    <>
      <WidgetTypeSheet
        isOpen={step === "type"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        onSelect={onChooseType}
      />
      <AreaPickerSheet
        isOpen={step === "area"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        onSelect={onPickArea}
      />
      <EntityPickerSheet
        isOpen={step === "entity" || step === "scene"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        used={used}
        domains={step === "scene" || sceneOnly ? SCENE_DOMAINS : undefined}
        onSelect={onPickEntity}
      />
    </>
  );
}
