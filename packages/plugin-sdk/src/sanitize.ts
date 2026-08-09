import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "br",
  "p",
  "div",
  "span",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "a",
];

const ALLOWED_ATTR = ["style", "href", "target", "rel"];

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
]);

let hooksRegistered = false;

function ensureHooks(): void {
  if (hooksRegistered) return;
  if (typeof window === "undefined") return;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) return;

    if (node.hasAttribute("href")) {
      node.setAttribute("rel", "noopener noreferrer");
    }

    if (!node.hasAttribute("style")) return;

    const style = (node as HTMLElement).style;
    const kept: string[] = [];
    for (let i = 0; i < style.length; i += 1) {
      const prop = style.item(i);
      if (!prop || !ALLOWED_STYLE_PROPS.has(prop)) continue;
      const value = style.getPropertyValue(prop).trim();
      if (!value) continue;
      // Block url() / expression() style payloads
      if (/url\s*\(|expression\s*\(|javascript:/i.test(value)) continue;
      kept.push(`${prop}: ${value}`);
    }

    if (kept.length > 0) {
      node.setAttribute("style", kept.join("; "));
    } else {
      node.removeAttribute("style");
    }
  });

  hooksRegistered = true;
}

const SANITIZE_CACHE_MAX = 64;
const sanitizeCache = new Map<string, string>();

/** Sanitize rich-text HTML for safe use with dangerouslySetInnerHTML. */
export function sanitizeRichText(html: string): string {
  if (!html) return "";

  const cached = sanitizeCache.get(html);
  if (cached !== undefined) return cached;

  let clean: string;
  if (typeof window === "undefined") {
    // SSR / non-DOM: strip tags as a coarse fallback
    clean = html.replace(/<[^>]*>/g, "");
  } else {
    ensureHooks();
    clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
    });
  }

  if (sanitizeCache.size >= SANITIZE_CACHE_MAX) {
    const oldest = sanitizeCache.keys().next().value;
    if (oldest !== undefined) sanitizeCache.delete(oldest);
  }
  sanitizeCache.set(html, clean);
  return clean;
}
