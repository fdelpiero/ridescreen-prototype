import { clear, del, entries, get, set } from 'idb-keyval'

/** Minimal key-value contract the data store is written against. */
export interface KV {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  del(key: string): Promise<void>
  entries(): Promise<[string, unknown][]>
  clear(): Promise<void>
}

/** IndexedDB in the browser: survives reloads and works with no connection. */
export const idbKV: KV = {
  get: (key) => get(key),
  set: (key, value) => set(key, value),
  del: (key) => del(key),
  entries: async () => (await entries()).map(([key, value]) => [String(key), value]),
  clear: () => clear(),
}

/** In-memory stand-in for tests. Values are cloned so callers cannot mutate stored data. */
export function memoryKV(): KV {
  const map = new Map<string, unknown>()
  return {
    get: async <T>(key: string) => (map.has(key) ? (structuredClone(map.get(key)) as T) : undefined),
    set: async (key, value) => void map.set(key, structuredClone(value)),
    del: async (key) => void map.delete(key),
    entries: async () => Array.from(map.entries(), ([key, value]) => [key, structuredClone(value)] as [string, unknown]),
    clear: async () => map.clear(),
  }
}
