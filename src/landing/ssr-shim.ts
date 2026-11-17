/**
 * Server render only: an empty in-memory localStorage, so app stores that read
 * it while loading (useSettingsStore) start from their defaults, as a first-time
 * visitor's browser would. Imported first by entry-server.tsx.
 */
if (typeof globalThis.localStorage === 'undefined') {
    const data = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
        get length() { return data.size; },
        clear: () => data.clear(),
        getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
        key: (i: number) => [...data.keys()][i] ?? null,
        removeItem: (k: string) => { data.delete(k); },
        setItem: (k: string, v: string) => { data.set(k, String(v)); },
    };
}
export {};
