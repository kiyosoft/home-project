import { createMMKV } from "react-native-mmkv";

import { createKv, type KvBackend } from "@/lib/kv";

const mmkv = createMMKV({ id: "ethio-home" });

const backend: KvBackend = {
  getString(key) {
    return mmkv.getString(key);
  },
  set(key, value) {
    mmkv.set(key, value);
  },
  remove(key) {
    mmkv.remove(key);
  },
};

export const kv = createKv(backend);
