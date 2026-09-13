export interface IngressSessionUser {
  id: string;
  username: string;
  name: string;
}

export interface IngressSession {
  token: string;
  user: IngressSessionUser | null;
}

export function isHassIngressPath(pathname: string): boolean {
  return pathname.includes("/api/hassio_ingress/");
}

export function isHassIngress(): boolean {
  return isHassIngressPath(window.location.pathname);
}

/** Resolve `/api/ethio/session` against the current page, including ingress prefixes. */
export function ingressSessionUrl(pageHref: string): string {
  const page = new URL(pageHref);
  let directory = page.pathname;
  if (!directory.endsWith("/")) {
    const file = directory.slice(directory.lastIndexOf("/") + 1);
    directory = file.includes(".")
      ? directory.slice(0, directory.lastIndexOf("/") + 1)
      : `${directory}/`;
  }
  return new URL("api/ethio/session", `${page.origin}${directory}`).href;
}

export function parseIngressSession(data: unknown): IngressSession | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;
  if (typeof body.token !== "string" || !body.token) return null;
  return { token: body.token, user: parseUser(body.user) };
}

function parseUser(value: unknown): IngressSessionUser | null {
  if (!value || typeof value !== "object") return null;
  const user = value as Record<string, unknown>;
  if (typeof user.id !== "string" || !user.id) return null;
  return {
    id: user.id,
    username: typeof user.username === "string" ? user.username : "",
    name: typeof user.name === "string" ? user.name : "",
  };
}

export async function fetchIngressSession(
  pageHref = window.location.href,
  fetcher: typeof fetch = fetch,
): Promise<IngressSession | null> {
  try {
    const response = await fetcher(ingressSessionUrl(pageHref), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return parseIngressSession(await response.json());
  } catch {
    return null;
  }
}
