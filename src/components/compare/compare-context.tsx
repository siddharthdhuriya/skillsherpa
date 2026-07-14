"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

// Client-side comparison basket: up to 4 courses, persisted in localStorage
// (via useSyncExternalStore, so it is SSR-safe and stays in sync across
// tabs). Selection is identified by slug (stable, URL-safe) plus title for
// the tray chips.

export const COMPARE_LIMIT = 4;
const STORAGE_KEY = "skillsherpa-compare";
const CHANGE_EVENT = "skillsherpa-compare-change";

export interface CompareItem {
  slug: string;
  title: string;
}

const EMPTY: CompareItem[] = [];
// Snapshot cache keyed by the raw storage string so getSnapshot returns a
// referentially stable array (required by useSyncExternalStore).
let snapshotRaw: string | null = null;
let snapshotParsed: CompareItem[] = EMPTY;

function readSnapshot(): CompareItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === snapshotRaw) return snapshotParsed;
  snapshotRaw = raw;
  if (!raw) {
    snapshotParsed = EMPTY;
    return snapshotParsed;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    snapshotParsed = Array.isArray(parsed)
      ? parsed
          .filter(
            (i): i is CompareItem =>
              typeof i === "object" &&
              i !== null &&
              typeof (i as CompareItem).slug === "string" &&
              typeof (i as CompareItem).title === "string",
          )
          .slice(0, COMPARE_LIMIT)
      : EMPTY;
  } catch {
    snapshotParsed = EMPTY;
  }
  return snapshotParsed;
}

function subscribe(onChange: () => void): () => void {
  // 'storage' covers other tabs; the custom event covers this tab's writes.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function write(next: CompareItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage blocked/full: fall back to in-memory snapshot only
    snapshotRaw = null;
    snapshotParsed = next;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface CompareContextValue {
  items: CompareItem[];
  isSelected: (slug: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);

  // Mutations read the live snapshot (not the rendered items) so rapid
  // successive toggles never clobber each other via stale closures.
  const toggle = useCallback((item: CompareItem) => {
    const current = readSnapshot();
    const exists = current.some((i) => i.slug === item.slug);
    if (exists) write(current.filter((i) => i.slug !== item.slug));
    else if (current.length < COMPARE_LIMIT) write([...current, item]);
  }, []);

  const remove = useCallback((slug: string) => {
    write(readSnapshot().filter((i) => i.slug !== slug));
  }, []);

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      isSelected: (slug) => items.some((i) => i.slug === slug),
      toggle,
      remove,
      clear: () => write([]),
      isFull: items.length >= COMPARE_LIMIT,
    }),
    [items, toggle, remove],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

// Null outside a provider (e.g. the admin card preview) so consumers can
// simply render nothing instead of crashing.
export function useCompare(): CompareContextValue | null {
  return useContext(CompareContext);
}
