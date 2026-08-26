/**
 * Query parameters that are a credential in their own right.
 * `token` is what Home Assistant puts on camera/media `entity_picture`;
 * `authSig` is what `auth/sign_path` adds.
 */
const CREDENTIAL_PARAMS = ["authSig", "token"];

export function carriesCredential(url: string): boolean {
  const query = url.split("?")[1];
  if (!query) return false;
  return query.split("&").some((pair) => {
    const key = pair.split("=")[0];
    return key !== undefined && CREDENTIAL_PARAMS.includes(key);
  });
}

/**
 * The signature covers the path and its query, so cache-busters have to be
 * part of `path` rather than appended to the result.
 */
export async function signPath(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  path: string,
  expiresSeconds = 300,
): Promise<string> {
  const result = await sendMessagePromise<{ path?: unknown }>({
    type: "auth/sign_path",
    path,
    expires: expiresSeconds,
  });

  const signed = result.path;
  if (typeof signed !== "string" || !signed) {
    throw new Error("auth/sign_path returned no path");
  }
  return signed;
}
