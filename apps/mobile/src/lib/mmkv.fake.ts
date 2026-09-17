export function createMMKV() {
  const map = new Map<string, string>();
  return {
    getString(key: string) {
      return map.get(key);
    },
    set(key: string, value: string | number | boolean) {
      map.set(key, String(value));
    },
    remove(key: string) {
      map.delete(key);
    },
  };
}
