import { Platform } from "react-native";
import Zeroconf, { ImplType, type ZeroconfService } from "react-native-zeroconf";
import { useCallback, useEffect, useRef, useState } from "react";

import { trimTrailingSlash } from "@/lib/url";

/** Home Assistant advertises this; the underscore is added natively. */
const SERVICE_TYPE = "home-assistant";
const SCAN_DURATION_MS = 6000;

export interface DiscoveredInstance {
  id: string;
  name: string;
  internalUrl: string;
  externalUrl: string;
  version: string;
}

export interface Discovery {
  instances: DiscoveredInstance[];
  scanning: boolean;
  /** False when the native module is missing, as in Expo Go. */
  available: boolean;
  rescan: () => void;
}

export function useDiscovery(enabled: boolean): Discovery {
  const [instances, setInstances] = useState<DiscoveredInstance[]>([]);
  const [scanning, setScanning] = useState(false);
  const [available, setAvailable] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const found = useRef(new Map<string, DiscoveredInstance>());

  const rescan = useCallback(() => {
    found.current = new Map();
    setInstances([]);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let zeroconf: Zeroconf;
    try {
      zeroconf = new Zeroconf();
    } catch {
      setAvailable(false);
      return;
    }

    setScanning(true);

    zeroconf.on("resolved", (service) => {
      const instance = toInstance(service);
      if (!instance) return;
      found.current.set(instance.id, instance);
      setInstances([...found.current.values()]);
    });
    zeroconf.on("error", () => {
      setScanning(false);
    });

    // Android NSD is flaky across manufacturers; DNSSD is the production impl.
    const implType = Platform.OS === "android" ? ImplType.DNSSD : ImplType.NSD;
    zeroconf.scan(SERVICE_TYPE, "tcp", "local.", implType);

    const timer = setTimeout(() => {
      setScanning(false);
      zeroconf.stop(implType);
    }, SCAN_DURATION_MS);

    return () => {
      clearTimeout(timer);
      zeroconf.stop(implType);
      zeroconf.removeAllListeners();
      zeroconf.removeDeviceListeners();
    };
  }, [enabled, attempt]);

  return { instances, scanning, available, rescan };
}

function toInstance(service: ZeroconfService): DiscoveredInstance | null {
  const txt = service.txt ?? {};
  const internalUrl = txt.internal_url?.trim()
    ? trimTrailingSlash(txt.internal_url)
    : addressUrl(service);
  if (!internalUrl) return null;

  return {
    id: txt.uuid?.trim() || service.name,
    name: txt.location_name?.trim() || service.name,
    internalUrl,
    externalUrl: txt.external_url?.trim()
      ? trimTrailingSlash(txt.external_url)
      : "",
    version: txt.version?.trim() ?? "",
  };
}

/** Prefer a literal address; Android often cannot resolve advertised `.local.` names. */
function addressUrl(service: ZeroconfService): string {
  const port = service.port;
  if (!port) return "";
  const ipv4 = service.addresses?.find((address) => address.includes("."));
  const host = ipv4 ?? service.host;
  if (!host) return "";
  return `http://${host.replace(/\.$/, "")}:${port}`;
}
