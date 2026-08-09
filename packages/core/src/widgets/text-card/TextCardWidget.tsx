import type { WidgetComponentProps } from "@ethio/plugin-sdk";

import { TextCardBody } from "./TextCardBody";

export function TextCardWidget({ config }: WidgetComponentProps) {
  return <TextCardBody config={config} />;
}
