import { cx } from "../ui";

export function WidgetPlaceholder({
  title,
  message,
  dashed = false,
}: {
  title: string;
  message: string;
  dashed?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card p-5 text-card-foreground shadow-sm",
        dashed ? "border-dashed border-border" : "border-border",
      )}
    >
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
