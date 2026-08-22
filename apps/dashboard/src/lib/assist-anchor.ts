export interface AssistAnchorRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface AssistPanelBox {
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const PANEL_WIDTH = 28 * 16;
const PANEL_HEIGHT = 36 * 16;
const GAP = 10;
const INSET = 8;

export function assistPanelBox(
  anchor: AssistAnchorRect,
  viewport: { width: number; height: number },
): AssistPanelBox {
  const width = Math.min(PANEL_WIDTH, Math.max(240, viewport.width - INSET * 2));
  const right = Math.min(
    Math.max(INSET, viewport.width - anchor.right),
    viewport.width - width - INSET,
  );
  const spaceAbove = Math.max(0, anchor.top - GAP - INSET);
  const height = Math.min(PANEL_HEIGHT, spaceAbove);
  const bottom = Math.max(INSET, viewport.height - anchor.top + GAP);
  return { right, bottom, width, height };
}

export function readAnchorRect(el: Element): AssistAnchorRect {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}
