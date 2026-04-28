/**
 * dataCache.ts – Caché en memoria para datos del dashboard.
 * Evita re-fetch en cambios de pestaña / re-renders.
 * TTL por defecto: 60 segundos.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export const DataCache = {
  get<T>(key: string): T | null {
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },

  set<T>(key: string, data: T, ttlMs = 60_000): void {
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
  },

  invalidate(key: string): void {
    store.delete(key);
  },

  invalidatePrefix(prefix: string): void {
    store.forEach((_, k) => {
      if (k.startsWith(prefix)) store.delete(k);
    });
  },

  clear(): void {
    store.clear();
  },
};
