/** String get/set/remove. MMKV and the in-memory test adapter both fit this. */
export interface KvBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface Kv {
  getJson(key: string): unknown | null;
  setJson(key: string, value: unknown): void;
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  getFlag(key: string): boolean | null;
  setFlag(key: string, value: boolean): void;
  remove(key: string): void;
}

export function createMemoryBackend(): KvBackend {
  const map = new Map<string, string>();
  return {
    getString(key) {
      return map.get(key);
    },
    set(key, value) {
      map.set(key, value);
    },
    remove(key) {
      map.delete(key);
    },
  };
}

export function createKv(backend: KvBackend): Kv {
  return {
    getJson(key) {
      const raw = backend.getString(key);
      if (raw == null || raw === "") return null;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    },
    setJson(key, value) {
      backend.set(key, JSON.stringify(value));
    },
    getString(key) {
      return backend.getString(key) ?? null;
    },
    setString(key, value) {
      backend.set(key, value);
    },
    getFlag(key) {
      const raw = backend.getString(key);
      if (raw === "1") return true;
      if (raw === "0") return false;
      return null;
    },
    setFlag(key, value) {
      backend.set(key, value ? "1" : "0");
    },
    remove(key) {
      backend.remove(key);
    },
  };
}
