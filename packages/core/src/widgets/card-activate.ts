import type { KeyboardEvent } from "react";

export function cardActivateProps(
  interactive: boolean | undefined,
  open: () => void,
) {
  if (!interactive) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: open,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    },
  };
}
