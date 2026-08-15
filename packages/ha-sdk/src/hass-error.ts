/** Home Assistant websocket command failures are `{ code, message }`, not Error. */
export function normalizeHassError(
  error: unknown,
  fallback = "Request failed",
): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string" && error.trim()) return new Error(error);
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return new Error(message);
    }
  }
  return new Error(fallback);
}
