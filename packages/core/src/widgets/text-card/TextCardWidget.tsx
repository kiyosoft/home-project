import { useEntities, type WidgetComponentProps } from "@ethio/plugin-sdk";

import { TextCardBody } from "./TextCardBody";

export function TextCardWidget({ config }: WidgetComponentProps) {
  const entities = useEntities();
  return <TextCardBody config={config} entities={entities} />;
}
