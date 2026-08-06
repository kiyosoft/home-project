async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(pin.trim());
}

export async function verifyPin(
  pin: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) return true;
  const next = await hashPin(pin);
  return next === hash;
}
