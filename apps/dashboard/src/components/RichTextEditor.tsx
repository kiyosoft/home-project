import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Italic,
  List,
  Underline,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => {
        // Keep selection in the editor
        event.preventDefault();
      }}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const locale = useLocaleStore((state) => state.locale);
  const entities = useHaStore((state) => state.entities);
  const editorRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const entityListId = useId();
  const [entityQuery, setEntityQuery] = useState("");
  const [conditionExpr, setConditionExpr] = useState("");

  useEffect(() => {
    const el = editorRef.current;
    if (!el || seededRef.current) return;
    el.innerHTML = value || "";
    seededRef.current = true;
  }, [value]);

  function emitChange() {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }

  function insertText(text: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      el.append(document.createTextNode(text));
      emitChange();
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    emitChange();
  }

  function wrapSelection(before: string, after: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      insertText(`${before}${after}`);
      return;
    }
    const range = selection.getRangeAt(0);
    const selected = range.toString();
    range.deleteContents();
    const node = document.createTextNode(`${before}${selected}${after}`);
    range.insertNode(node);
    selection.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(node);
    next.collapse(false);
    selection.addRange(next);
    emitChange();
  }

  const entityIds = Object.keys(entities).sort();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton
          label={t(locale, "textCard.bold")}
          onClick={() => {
            exec("bold");
            emitChange();
          }}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={t(locale, "textCard.italic")}
          onClick={() => {
            exec("italic");
            emitChange();
          }}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={t(locale, "textCard.underline")}
          onClick={() => {
            exec("underline");
            emitChange();
          }}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={t(locale, "textCard.heading")}
          onClick={() => {
            exec("formatBlock", "h2");
            emitChange();
          }}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={t(locale, "textCard.list")}
          onClick={() => {
            exec("insertUnorderedList");
            emitChange();
          }}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <ToolbarButton
          label={t(locale, "textCard.alignLeft")}
          onClick={() => {
            exec("justifyLeft");
            emitChange();
          }}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={t(locale, "textCard.alignCenter")}
          onClick={() => {
            exec("justifyCenter");
            emitChange();
          }}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={t(locale, "textCard.alignRight")}
          onClick={() => {
            exec("justifyRight");
            emitChange();
          }}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <label className="inline-flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <span>{t(locale, "textCard.color")}</span>
          <input
            type="color"
            className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
            defaultValue="#1c1916"
            onMouseDown={(event) => event.preventDefault()}
            onChange={(event) => {
              exec("foreColor", event.target.value);
              emitChange();
            }}
          />
        </label>
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label={placeholder ?? t(locale, "textCard.placeholder")}
        aria-multiline="true"
        aria-placeholder={placeholder}
        className="rich-text min-h-36 w-full resize-y px-4 py-3 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(aria-placeholder)]"
        onInput={emitChange}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          insertText(text);
        }}
      />

      <div className="space-y-2 border-t border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {t(locale, "textCard.templateHint")}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1 space-y-1 text-xs">
            <span className="font-medium">{t(locale, "textCard.insertEntity")}</span>
            <Input
              list={entityListId}
              value={entityQuery}
              placeholder="person.kidus"
              onChange={(event) => setEntityQuery(event.target.value)}
            />
            <datalist id={entityListId}>
              {entityIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const id = entityQuery.trim();
              if (!id) return;
              insertText(`{{ states('${id}') }}`);
              setEntityQuery("");
            }}
          >
            {t(locale, "textCard.insert")}
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1 space-y-1 text-xs">
            <span className="font-medium">
              {t(locale, "textCard.wrapCondition")}
            </span>
            <Input
              value={conditionExpr}
              placeholder="binary_sensor.fasting"
              onChange={(event) => setConditionExpr(event.target.value)}
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const id = conditionExpr.trim() || "entity_id";
              wrapSelection(
                `{% if is_state('${id}', 'on') %}`,
                "{% endif %}",
              );
            }}
          >
            {t(locale, "textCard.wrap")}
          </Button>
        </div>
      </div>
    </div>
  );
}
