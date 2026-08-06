import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/store/dashboard-store";

export function PinDialog() {
  const pinDialog = useDashboardStore((state) => state.pinDialog);
  const closePinDialog = useDashboardStore((state) => state.closePinDialog);
  const submitPin = useDashboardStore((state) => state.submitPin);
  const setPin = useDashboardStore((state) => state.setPin);

  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setting = pinDialog === "set-pin";
  const open = Boolean(pinDialog);

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (setting) {
        if (pin.trim().length < 4) {
          setError("PIN must be at least 4 characters");
          return;
        }
        if (pin !== confirm) {
          setError("PINs do not match");
          return;
        }
        await setPin(pin);
        setPinValue("");
        setConfirm("");
        return;
      }

      const ok = await submitPin(pin);
      if (!ok) {
        setError("Incorrect PIN");
        return;
      }
      setPinValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setPinValue("");
        setConfirm("");
        setError(null);
        closePinDialog();
      }}
      title={setting ? "Set PIN" : "Enter PIN"}
      description={
        setting
          ? "PIN is required to enter edit mode and exit kiosk."
          : "This dashboard is PIN protected."
      }
    >
      <div className="space-y-3">
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PIN"
          value={pin}
          onChange={(event) => setPinValue(event.target.value)}
          disabled={busy}
        />
        {setting ? (
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Confirm PIN"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={busy}
          />
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              closePinDialog();
              setPinValue("");
              setConfirm("");
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {setting ? "Save PIN" : "Unlock"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
