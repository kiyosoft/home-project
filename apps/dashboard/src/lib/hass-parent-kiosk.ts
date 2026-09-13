const HIDDEN_MARK = "data-ethio-kiosk-hidden";
const VARS_MARK = "data-ethio-kiosk-vars";

export function isEmbeddedHassWindow(
  current: Window | undefined,
  parent: Window | undefined,
): boolean {
  if (!current || !parent || parent === current) return false;
  try {
    void parent.location.href;
    return true;
  } catch {
    return false;
  }
}

export function dispatchHassKioskMode(
  target: EventTarget,
  enable: boolean,
): void {
  target.dispatchEvent(
    new CustomEvent("hass-kiosk-mode", { detail: { enable } }),
  );
}

function hassElement(
  doc: Document,
): (HTMLElement & { hass?: { kioskMode?: boolean } }) | null {
  const el = doc.querySelector("home-assistant");
  return el instanceof HTMLElement
    ? (el as HTMLElement & { hass?: { kioskMode?: boolean } })
    : null;
}

function nativeKioskApplied(doc: Document, enable: boolean): boolean {
  const hass = hassElement(doc)?.hass;
  return Boolean(hass && "kioskMode" in hass && hass.kioskMode === enable);
}

function collapseDrawer(el: HTMLElement, collapse: boolean): void {
  if (collapse) {
    el.setAttribute(VARS_MARK, "1");
    el.style.setProperty("--ha-sidebar-width", "0px");
    el.style.setProperty("--mdc-drawer-width", "0px");
    el.style.setProperty("--ha-top-app-bar-width", "100%");
    return;
  }
  if (!el.hasAttribute(VARS_MARK)) return;
  el.removeAttribute(VARS_MARK);
  el.style.removeProperty("--ha-sidebar-width");
  el.style.removeProperty("--mdc-drawer-width");
  el.style.removeProperty("--ha-top-app-bar-width");
}

function hideElement(el: HTMLElement, hide: boolean): void {
  if (hide) {
    if (!el.hasAttribute(HIDDEN_MARK)) {
      el.setAttribute(HIDDEN_MARK, el.style.display);
    }
    el.style.setProperty("display", "none", "important");
    return;
  }
  if (!el.hasAttribute(HIDDEN_MARK)) return;
  const previous = el.getAttribute(HIDDEN_MARK);
  el.removeAttribute(HIDDEN_MARK);
  if (previous) el.style.display = previous;
  else el.style.removeProperty("display");
}

function applySidebarFallback(doc: Document, hide: boolean): void {
  const root = hassElement(doc);
  const main = root?.shadowRoot?.querySelector("home-assistant-main");
  if (main instanceof HTMLElement) {
    collapseDrawer(main, hide);
    const drawer = main.shadowRoot?.querySelector("ha-drawer") ??
      main.querySelector("ha-drawer");
    if (drawer instanceof HTMLElement) collapseDrawer(drawer, hide);
    const sidebar =
      main.querySelector("ha-sidebar") ??
      main.shadowRoot?.querySelector("ha-sidebar") ??
      (drawer instanceof HTMLElement ? drawer.querySelector("ha-sidebar") : null);
    if (sidebar instanceof HTMLElement) hideElement(sidebar, hide);
  }

  const menuButtons = [
    ...(root?.shadowRoot?.querySelectorAll("ha-menu-button") ?? []),
    ...(main instanceof HTMLElement
      ? [...(main.shadowRoot?.querySelectorAll("ha-menu-button") ?? []), ...main.querySelectorAll("ha-menu-button")]
      : []),
  ];
  for (const button of menuButtons) {
    if (button instanceof HTMLElement) hideElement(button, hide);
  }
}

/** Hide or restore the parent Home Assistant sidebar while this iframe is in kiosk. */
export function setHassParentKiosk(enable: boolean): void {
  if (!isEmbeddedHassWindow(window, window.parent)) return;

  const parentWindow = window.parent;
  dispatchHassKioskMode(parentWindow, enable);

  if (nativeKioskApplied(parentWindow.document, enable)) {
    applySidebarFallback(parentWindow.document, false);
    return;
  }
  applySidebarFallback(parentWindow.document, enable);
}
