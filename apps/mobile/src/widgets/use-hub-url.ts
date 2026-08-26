import { carriesCredential, signPath } from "@ethio/ha-sdk";
import { useEffect, useState } from "react";

import { useHaStore } from "@/store/ha-store";

const SIGNATURE_TTL_SECONDS = 300;

function offHub(path: string): boolean {
  return (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  );
}

/**
 * Join a Home Assistant media path to the live socket's origin.
 * Paths that already carry a credential are left as-is; the rest are signed
 * via `auth/sign_path`. Fold cache-busters into `path` before calling —
 * appending after the signature invalidates it.
 */
export function useHubUrl(
  path: string | null | undefined,
  refreshKey = 0,
): string | null {
  const activeUrl = useHaStore((state) => state.activeUrl);
  const mode = useHaStore((state) => state.mode);
  const sendMessagePromise = useHaStore((state) => state.sendMessagePromise);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = path?.trim();
    if (!trimmed) {
      setUrl(null);
      return;
    }
    if (offHub(trimmed)) {
      setUrl(trimmed);
      return;
    }
    if (!activeUrl) {
      setUrl(null);
      return;
    }

    const base = activeUrl.replace(/\/+$/, "");
    const relative = withCacheBuster(
      trimmed.startsWith("/") ? trimmed : `/${trimmed}`,
      refreshKey,
    );

    if (mode !== "live" || carriesCredential(relative)) {
      setUrl(`${base}${relative}`);
      return;
    }

    let current = true;
    void signPath(sendMessagePromise, relative, SIGNATURE_TTL_SECONDS)
      .then((signed) => {
        if (current) setUrl(`${base}${signed}`);
      })
      .catch(() => {
        if (current) setUrl(`${base}${relative}`);
      });

    return () => {
      current = false;
    };
  }, [path, activeUrl, mode, sendMessagePromise, refreshKey]);

  return url;
}

function withCacheBuster(path: string, refreshKey: number): string {
  if (refreshKey === 0) return path;
  return `${path}${path.includes("?") ? "&" : "?"}t=${refreshKey}`;
}
