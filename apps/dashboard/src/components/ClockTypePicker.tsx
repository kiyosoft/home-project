import type { ClockType } from "@ethio/core";

import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/store/locale-store";

interface ClockTypePickerProps {
  value: ClockType;
  onChange: (value: ClockType) => void;
}

const OPTIONS: ClockType[] = ["analog", "digital"];

function AnalogPreview() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => {
        const deg = i * 30;
        const rad = ((deg - 90) * Math.PI) / 180;
        const inner = 22;
        const outer = 28;
        return (
          <line
            key={i}
            x1={32 + Math.cos(rad) * inner}
            y1={32 + Math.sin(rad) * inner}
            x2={32 + Math.cos(rad) * outer}
            y2={32 + Math.sin(rad) * outer}
            className="stroke-foreground/55"
            strokeWidth={i % 3 === 0 ? 2 : 1.2}
            strokeLinecap="round"
          />
        );
      })}
      <line
        x1="32"
        y1="36"
        x2="32"
        y2="16"
        className="stroke-foreground"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="34"
        x2="46"
        y2="32"
        className="stroke-foreground"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="40"
        x2="44"
        y2="14"
        className="stroke-primary"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="2.4" className="fill-foreground" />
      <circle cx="32" cy="32" r="1.1" className="fill-primary" />
    </svg>
  );
}

function DigitalPreview() {
  return (
    <div className="flex h-full w-full flex-col justify-end">
      <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Fri
      </p>
      <p className="font-display text-2xl font-semibold leading-none tracking-tighter">
        10
      </p>
      <p className="mt-0.5 text-sm font-medium tabular-nums tracking-tight text-muted-foreground">
        08
      </p>
    </div>
  );
}

export function ClockTypePicker({ value, onChange }: ClockTypePickerProps) {
  const locale = useLocaleStore((state) => state.locale);

  return (
    <div
      role="radiogroup"
      aria-label={t(locale, "schema.clockType")}
      className="grid grid-cols-2 gap-2"
    >
      {OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={
              option === "analog"
                ? t(locale, "schema.clockTypeAnalog")
                : t(locale, "schema.clockTypeDigital")
            }
            onClick={() => onChange(option)}
            className={cn(
              "flex flex-col gap-2 rounded-2xl border p-2.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary bg-primary/10"
                : "border-border bg-background hover:bg-muted/60",
            )}
          >
            <div
              aria-hidden
              className="flex h-[72px] items-center justify-center overflow-hidden rounded-xl bg-card px-2 py-1.5"
            >
              {option === "analog" ? <AnalogPreview /> : <DigitalPreview />}
            </div>
            <span className="text-sm font-medium">
              {option === "analog"
                ? t(locale, "schema.clockTypeAnalog")
                : t(locale, "schema.clockTypeDigital")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
