import type { HassEntities } from "./types";

export interface RenderTemplateOptions {
  template: string;
  variables?: Record<string, unknown>;
  timeout?: number;
  strict?: boolean;
  report_errors?: boolean;
}

export interface RenderTemplateUpdate {
  result?: string;
  error?: string;
}

type SubscribeMessage = <T>(
  message: Record<string, unknown>,
  onMessage: (result: T) => void,
) => Promise<() => void>;

interface HaTemplateEvent {
  result?: unknown;
  error?: unknown;
  level?: unknown;
  listeners?: unknown;
}

function coerceResult(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

/** Decode common HTML entities (rich-text editors turn `<` into `&lt;`). */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
    })
    .replace(/&#(\d+);/g, (_match, dec: string) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
    })
    .replace(/&amp;/gi, "&");
}

/**
 * Rich-text HTML stores `<` / `>` as entities inside Jinja delimiters.
 * Decode those blocks before sending to HA so `{% if x < 12 %}` works.
 */
export function decodeEntitiesInJinjaBlocks(template: string): string {
  if (!template || !template.includes("&")) return template;
  return template.replace(
    /(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\})/g,
    (block) => decodeHtmlEntities(block),
  );
}

/** Live Jinja render via HA `render_template` subscription. */
export function subscribeRenderTemplate(
  subscribeMessage: SubscribeMessage,
  options: RenderTemplateOptions,
  onUpdate: (update: RenderTemplateUpdate) => void,
): Promise<() => void> {
  const message: Record<string, unknown> = {
    type: "render_template",
    template: decodeEntitiesInJinjaBlocks(options.template),
    report_errors: options.report_errors ?? true,
  };
  if (options.variables) message.variables = options.variables;
  if (options.timeout != null) message.timeout = options.timeout;
  if (options.strict != null) message.strict = options.strict;

  return subscribeMessage<HaTemplateEvent>(message, (event) => {
    if (typeof event.error === "string" && event.error) {
      onUpdate({ error: event.error });
      return;
    }
    if ("result" in event) {
      onUpdate({ result: coerceResult(event.result) });
    }
  });
}

function readState(entities: HassEntities, entityId: string): string {
  return entities[entityId]?.state ?? "unknown";
}

function readAttr(
  entities: HassEntities,
  entityId: string,
  attr: string,
): unknown {
  return entities[entityId]?.attributes?.[attr];
}

function evalIsState(
  entities: HassEntities,
  entityId: string,
  expected: string,
): boolean {
  return readState(entities, entityId) === expected;
}

/** Evaluate a minimal subset of HA template expressions for demo mode. */
function evaluateExpression(
  expr: string,
  entities: HassEntities,
): unknown {
  const trimmed = expr.trim();

  const isState = trimmed.match(
    /^is_state\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)$/,
  );
  if (isState) {
    return evalIsState(entities, isState[1]!, isState[2]!);
  }

  const states = trimmed.match(/^states\(\s*['"]([^'"]+)['"]\s*\)$/);
  if (states) {
    return readState(entities, states[1]!);
  }

  const stateAttr = trimmed.match(
    /^state_attr\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)$/,
  );
  if (stateAttr) {
    return readAttr(entities, stateAttr[1]!, stateAttr[2]!);
  }

  return undefined;
}

function isTruthy(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return !(
      lower === "" ||
      lower === "off" ||
      lower === "unavailable" ||
      lower === "unknown" ||
      lower === "none" ||
      lower === "false" ||
      lower === "0"
    );
  }
  return Boolean(value);
}

function interpolateExpressions(
  template: string,
  entities: HassEntities,
): string {
  return template.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_match, raw: string) => {
    const value = evaluateExpression(raw, entities);
    if (value == null) return "";
    return coerceResult(value);
  });
}

type Token =
  | { kind: "if"; condition: string; index: number; length: number }
  | { kind: "else"; index: number; length: number }
  | { kind: "endif"; index: number; length: number };

function nextToken(input: string, from: number): Token | null {
  const slice = input.slice(from);
  const match = slice.match(/\{%\s*(if\b[\s\S]*?|else|endif)\s*%\}/);
  if (!match || match.index == null) return null;
  const index = from + match.index;
  const length = match[0].length;
  const body = match[1]!.trim();
  if (body === "else") return { kind: "else", index, length };
  if (body === "endif") return { kind: "endif", index, length };
  if (body.startsWith("if")) {
    const condition = body.slice(2).trim();
    return { kind: "if", condition, index, length };
  }
  return null;
}

/**
 * Minimal demo Jinja stub: `states()`, `state_attr()`, `is_state()`,
 * and `{% if %}…{% else %}…{% endif %}`. Unrecognized tags are left as-is.
 */
export function renderDemoTemplate(
  template: string,
  entities: HassEntities,
): string {
  if (!template) return "";
  if (!/\{%\s*if\b/.test(template)) {
    return interpolateExpressions(template, entities);
  }

  let out = "";
  let cursor = 0;

  while (cursor < template.length) {
    const open = nextToken(template, cursor);
    if (!open || open.kind !== "if") {
      out += interpolateExpressions(template.slice(cursor), entities);
      break;
    }

    // Text before this if
    out += interpolateExpressions(
      template.slice(cursor, open.index),
      entities,
    );

    const afterOpen = open.index + open.length;
    let depth = 1;
    let scan = afterOpen;
    let elseIndex = -1;
    let elseLength = 0;
    let endIndex = -1;
    let endLength = 0;

    while (scan < template.length) {
      const token = nextToken(template, scan);
      if (!token) break;
      if (token.kind === "if") {
        depth += 1;
      } else if (token.kind === "else") {
        if (depth === 1 && elseIndex < 0) {
          elseIndex = token.index;
          elseLength = token.length;
        }
      } else if (token.kind === "endif") {
        depth -= 1;
        if (depth === 0) {
          endIndex = token.index;
          endLength = token.length;
          break;
        }
      }
      scan = token.index + token.length;
    }

    if (endIndex < 0) {
      // Unbalanced — leave the rest as interpolated text
      out += interpolateExpressions(template.slice(open.index), entities);
      break;
    }

    const consequentEnd = elseIndex >= 0 ? elseIndex : endIndex;
    const consequent = template.slice(afterOpen, consequentEnd);
    const alternate =
      elseIndex >= 0
        ? template.slice(elseIndex + elseLength, endIndex)
        : "";

    const branch = isTruthy(evaluateExpression(open.condition, entities))
      ? consequent
      : alternate;
    out += renderDemoTemplate(branch, entities);
    cursor = endIndex + endLength;
  }

  return out;
}
