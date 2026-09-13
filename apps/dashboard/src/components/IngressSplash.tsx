import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

/** Add-on boot failure. Never a login form. */
export function IngressSplash() {
  const locale = useLocaleStore((state) => state.locale);
  const error = useHaStore((state) => state.error);
  const connectIngress = useHaStore((state) => state.connectIngress);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
      <p>{error ?? t(locale, "setup.errorIngressSession")}</p>
      <Button
        onClick={() => {
          void connectIngress();
        }}
      >
        {t(locale, "setup.ingressRetry")}
      </Button>
    </div>
  );
}
