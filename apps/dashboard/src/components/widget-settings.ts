import type { ComponentType } from "react";

import { TextCardSettingsForm } from "@/components/TextCardSettingsForm";

export interface CustomSettingsProps {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const CUSTOM_WIDGET_SETTINGS: Record<
  string,
  ComponentType<CustomSettingsProps>
> = {
  "@ethio/core/text-card": TextCardSettingsForm,
};
