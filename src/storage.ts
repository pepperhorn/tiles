export type Store<T> = {
  list(): string[];
  save(name: string, value: T): boolean;
  load(name: string): T | undefined;
  remove(name: string): boolean;
};

export function createStore<T>(key: string): Store<T> {
  const readAll = (): Record<string, T> => {
    try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; }
    catch { return {}; }
  };
  const writeAll = (obj: Record<string, T>): boolean => {
    try { localStorage.setItem(key, JSON.stringify(obj)); return true; }
    catch { return false; }
  };
  return {
    list: () => Object.keys(readAll()).sort((a, b) => a.localeCompare(b)),
    save: (name, value) => { const all = readAll(); all[name] = value; return writeAll(all); },
    load: (name) => readAll()[name],
    remove: (name) => { const all = readAll(); delete all[name]; return writeAll(all); },
  };
}

export const templateStore = createStore('crf_note_tiles_templates_v1');
export const designStore = createStore('crf_sheet_designs_v1');
