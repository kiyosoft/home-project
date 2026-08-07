import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { useLocaleStore } from "@/store/locale-store";

export function PinDialog() {
  const locale = useLocaleStore((state) => state.locale);
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
          setError(t(locale, "pin.errorShort"));
          return;
        }
        if (pin !== confirm) {
          setError(t(locale, "pin.errorMismatch"));
          return;
        }
        await setPin(pin);
        setPinValue("");
        setConfirm("");
        return;
      }

      const ok = await submitPin(pin);
      if (!ok) {
        setError(t(locale, "pin.errorIncorrect"));
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
      title={setting ? t(locale, "pin.setTitle") : t(locale, "pin.enterTitle")}
      description={
        setting
          ? t(locale, "pin.setDescription")
          : t(locale, "pin.enterDescription")
      }
    >
      <div className="space-y-3">
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t(locale, "pin.placeholder")}
          value={pin}
          onChange={(event) => setPinValue(event.target.value)}
          disabled={busy}
        />
        {setting ? (
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder={t(locale, "pin.confirmPlaceholder")}
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
            {t(locale, "pin.cancel")}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {setting ? t(locale, "pin.save") : t(locale, "pin.unlock")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
