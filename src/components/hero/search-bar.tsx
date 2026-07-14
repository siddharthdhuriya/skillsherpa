"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, FolderOpen, GraduationCap } from "lucide-react";
import type { Suggestion } from "@/lib/data";

// Hero search: glass card, debounced autocomplete against course titles and
// categories via /api/suggest. Fully keyboard navigable (arrows + enter +
// escape) with combobox ARIA semantics.
export function HeroSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autocomplete, driven from the change handler (not an effect).
  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(value)}`);
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
        setHighlighted(-1);
      } catch {
        // network hiccup: silently skip suggestions
      }
    }, 150);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function submit() {
    if (highlighted >= 0 && suggestions[highlighted]) {
      router.push(suggestions[highlighted].href);
    } else if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <div className="glass flex items-center gap-2 rounded-2xl p-2 shadow-lg">
        <Search aria-hidden="true" className="ml-2 size-5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="hero-suggestions"
          aria-label="Search courses"
          aria-activedescendant={highlighted >= 0 ? `suggestion-${highlighted}` : undefined}
          placeholder="Try &quot;data science certification&quot; or &quot;IELTS prep&quot;..."
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Search"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Search
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>

      {open && (
        <ul
          id="hero-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="glass absolute top-full z-30 mt-2 w-full overflow-hidden rounded-xl py-1 shadow-xl"
        >
          {suggestions.map((s, i) => (
            <li key={s.href} role="option" aria-selected={i === highlighted} id={`suggestion-${i}`}>
              <button
                type="button"
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm ${
                  i === highlighted ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => {
                  router.push(s.href);
                  setOpen(false);
                }}
              >
                {s.type === "category" ? (
                  <FolderOpen aria-hidden="true" className="size-4 shrink-0 text-primary" />
                ) : (
                  <GraduationCap aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{s.label}</span>
                {s.type === "category" && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">Category</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
