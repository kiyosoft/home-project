import type { ConnectionStatus } from "@ethio/ha-sdk";
import { LoaderCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConnectionStatusChipProps {
  status: ConnectionStatus;
  mode: "live" | "demo" | null;
  error: string | null;
  onReconnect?: () => void;
}

export function ConnectionStatusChip({
  status,
  mode,
  error,
  onReconnect,
}: ConnectionStatusChipProps) {
  const label =
    status === "connecting"
      ? "Connecting"
      : status === "connected"
        ? mode === "demo"
          ? "Demo"
          : "Connected"
        : status === "error"
          ? "Error"
          : "Idle";

  const Icon =
    status === "connecting"
      ? LoaderCircle
      : status === "connected"
        ? Wifi
        : WifiOff;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
          status === "connected" &&
            "border-success/30 bg-success/10 text-success",
          status === "connecting" &&
            "border-warning/30 bg-warning/10 text-warning",
          status === "error" &&
            "border-destructive/30 bg-destructive/10 text-destructive",
          status === "idle" && "border-border bg-muted text-muted-foreground",
        )}
        title={error ?? undefined}
      >
        <Icon
          className={cn("h-3.5 w-3.5", status === "connecting" && "animate-spin")}
        />
        {label}
      </div>
      {(status === "error" || status === "idle") && onReconnect ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onReconnect}
          aria-label="Reconnect"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
