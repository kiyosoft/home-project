import type { HassEntities } from "@ethio/ha-sdk";

export type TemplateIssueKind =
  | "unresolved"
  | "unbalanced"
  | "malformed_expression";

export interface TemplateIssue {
  kind: TemplateIssueKind;
  message: string;
  path?: string;
}

type Token =
  | { type: "text"; value: string }
  | { type: "value"; path: string }
  | { type: "if"; expr: string }
  | { type: "else" }
  | { type: "endif" };

type AstNode =
  | { type: "text"; value: string }
  | { type: "value"; path: string }
  | {
      type: "if";
      expr: string;
      consequent: AstNode[];
      alternate: AstNode[];
    };

const MARKER_RE = /\{\{([\s\S]*?)\}\}/g;
const TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const ENTITY_RE: Record<string, string> = {
  "&gt;": ">",
  "&lt;": "<",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const FALSEY_STATES = new Set([
  "",
  "off",
  "unavailable",
  "unknown",
  "none",
  "false",
  "0",
]);

const AST_CACHE_MAX = 64;
const astCache = new Map<string, AstNode[]>();

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:gt|lt|amp|quot|nbsp|#39);/g,
    (match) => ENTITY_RE[match] ?? match,
  );
}

/** Strip editor markup inside markers and decode HTML entities. */
export function normalizeMarkers(template: string): string {
  if (!template) return "";
  return template.replace(MARKER_RE, (_full, inner: string) => {
    const cleaned = decodeEntities(inner.replace(TAG_RE, "")).replace(
      /\u00a0/g,
      " ",
    );
    return `{{${cleaned}}}`;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resolveTemplatePath(
  path: string,
  entities: HassEntities,
): unknown {
  const parts = path.split(".").filter(Boolean);
  if (parts.length < 2) return undefined;

  const entityId = `${parts[0]}.${parts[1]}`;
  const entity = entities[entityId];
  if (!entity) return undefined;

  if (parts.length === 2) return entity.state;

  let current: unknown = entity.attributes;
  for (let i = 2; i < parts.length; i += 1) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[parts[i]!];
  }
  return current;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  const re = /\{\{\s*([\s\S]*?)\s*\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(source)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        value: source.slice(lastIndex, match.index),
      });
    }

    const inner = (match[1] ?? "").trim();
    if (inner === "else") {
      tokens.push({ type: "else" });
    } else if (inner === "/if") {
      tokens.push({ type: "endif" });
    } else if (inner.startsWith("#if")) {
      tokens.push({ type: "if", expr: inner.slice(3).trim() });
    } else {
      tokens.push({ type: "value", path: inner });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    tokens.push({ type: "text", value: source.slice(lastIndex) });
  }

  return tokens;
}

function parseTokens(tokens: Token[]): AstNode[] {
  type Frame = {
    consequent: AstNode[];
    alternate: AstNode[];
    expr: string;
    inAlternate: boolean;
  };

  const root: AstNode[] = [];
  const stack: Frame[] = [];

  function current(): AstNode[] {
    const frame = stack[stack.length - 1];
    if (!frame) return root;
    return frame.inAlternate ? frame.alternate : frame.consequent;
  }

  for (const token of tokens) {
    if (token.type === "text") {
      if (token.value) current().push({ type: "text", value: token.value });
      continue;
    }
    if (token.type === "value") {
      current().push({ type: "value", path: token.path });
      continue;
    }
    if (token.type === "if") {
      stack.push({
        consequent: [],
        alternate: [],
        expr: token.expr,
        inAlternate: false,
      });
      continue;
    }
    if (token.type === "else") {
      const frame = stack[stack.length - 1];
      if (frame) frame.inAlternate = true;
      continue;
    }
    if (token.type === "endif") {
      const frame = stack.pop();
      if (!frame) continue;
      current().push({
        type: "if",
        expr: frame.expr,
        consequent: frame.consequent,
        alternate: frame.alternate,
      });
    }
  }

  // Auto-close unclosed if blocks
  while (stack.length > 0) {
    const frame = stack.pop()!;
    current().push({
      type: "if",
      expr: frame.expr,
      consequent: frame.consequent,
      alternate: frame.alternate,
    });
  }

  return root;
}

function parseTemplate(template: string): AstNode[] {
  const normalized = normalizeMarkers(template);
  const cached = astCache.get(normalized);
  if (cached) return cached;

  const ast = parseTokens(tokenize(normalized));
  if (astCache.size >= AST_CACHE_MAX) {
    const oldest = astCache.keys().next().value;
    if (oldest !== undefined) astCache.delete(oldest);
  }
  astCache.set(normalized, ast);
  return ast;
}

type ComparisonOp = "==" | "!=" | ">" | "<" | ">=" | "<=";

function parseExpression(expr: string):
  | { kind: "truthy"; path: string }
  | { kind: "compare"; path: string; op: ComparisonOp; literal: string }
  | { kind: "invalid"; reason: string } {
  const trimmed = expr.trim();
  if (!trimmed) return { kind: "invalid", reason: "Empty condition" };

  const compareMatch = trimmed.match(
    /^([a-zA-Z0-9_.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/,
  );
  if (compareMatch) {
    let literal = (compareMatch[3] ?? "").trim();
    if (
      (literal.startsWith('"') && literal.endsWith('"')) ||
      (literal.startsWith("'") && literal.endsWith("'"))
    ) {
      literal = literal.slice(1, -1);
    }
    return {
      kind: "compare",
      path: compareMatch[1]!,
      op: compareMatch[2] as ComparisonOp,
      literal,
    };
  }

  if (/^[a-zA-Z0-9_.]+$/.test(trimmed)) {
    return { kind: "truthy", path: trimmed };
  }

  return { kind: "invalid", reason: `Malformed expression: ${trimmed}` };
}

function isTruthyState(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  const text = String(value).trim().toLowerCase();
  return !FALSEY_STATES.has(text);
}

function evaluateExpression(expr: string, entities: HassEntities): boolean {
  const parsed = parseExpression(expr);
  if (parsed.kind === "invalid") return false;

  const left = resolveTemplatePath(parsed.path, entities);

  if (parsed.kind === "truthy") {
    return isTruthyState(left);
  }

  const right = parsed.literal;
  const leftText = left === undefined || left === null ? "" : String(left);

  if (parsed.op === "==") return leftText === right;
  if (parsed.op === "!=") return leftText !== right;

  const leftNum = Number(leftText);
  const rightNum = Number(right);
  if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) return false;

  if (parsed.op === ">") return leftNum > rightNum;
  if (parsed.op === "<") return leftNum < rightNum;
  if (parsed.op === ">=") return leftNum >= rightNum;
  return leftNum <= rightNum;
}

function renderNodes(nodes: AstNode[], entities: HassEntities): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += node.value;
      continue;
    }
    if (node.type === "value") {
      const value = resolveTemplatePath(node.path, entities);
      if (value === undefined || value === null) continue;
      out += escapeHtml(String(value));
      continue;
    }
    const branch = evaluateExpression(node.expr, entities)
      ? node.consequent
      : node.alternate;
    out += renderNodes(branch, entities);
  }
  return out;
}

/**
 * Render a rich-text template: interpolate entity values (HTML-escaped)
 * and evaluate `{{#if}}/{{else}}/{{/if}}` branches.
 */
export function renderTemplate(
  template: string,
  entities: HassEntities,
): string {
  if (!template) return "";
  return renderNodes(parseTemplate(template), entities);
}

export function collectTemplateIssues(
  template: string,
  entities: HassEntities,
): TemplateIssue[] {
  if (!template) return [];

  const issues: TemplateIssue[] = [];
  const normalized = normalizeMarkers(template);

  const openCount = (normalized.match(/\{\{\s*#if\b/g) ?? []).length;
  const closeCount = (normalized.match(/\{\{\s*\/if\s*\}\}/g) ?? []).length;
  if (openCount !== closeCount) {
    issues.push({
      kind: "unbalanced",
      message: `Unbalanced if/endif markers (${openCount} open, ${closeCount} close)`,
    });
  }

  const re = /\{\{\s*([\s\S]*?)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    const inner = (match[1] ?? "").trim();
    if (inner === "else" || inner === "/if") continue;

    if (inner.startsWith("#if")) {
      const expr = inner.slice(3).trim();
      const parsed = parseExpression(expr);
      if (parsed.kind === "invalid") {
        issues.push({
          kind: "malformed_expression",
          message: parsed.reason,
        });
        continue;
      }
      const path = parsed.path;
      if (resolveTemplatePath(path, entities) === undefined) {
        issues.push({
          kind: "unresolved",
          message: `Unknown entity path: ${path}`,
          path,
        });
      }
      continue;
    }

    if (resolveTemplatePath(inner, entities) === undefined) {
      issues.push({
        kind: "unresolved",
        message: `Unknown entity path: ${inner}`,
        path: inner,
      });
    }
  }

  return issues;
}
