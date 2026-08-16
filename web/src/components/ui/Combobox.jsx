"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * The search control behind all three pickers in the Search sheet.
 *
 * The three of them — states, portfolios, MPs — were the same component three
 * times over: the same open/active state, the same outside-press dismissal,
 * the same arrow/Home/End/Enter/Escape/Tab handling, the same ARIA wiring,
 * the same box and listbox and row chrome, character for character. What
 * actually differed was where the rows come from, what the two lines in a row
 * say, and the words around them. Only that is left to the callers, which is
 * why this takes `results` rather than a way of fetching them: the MP picker
 * searches the server as you type and the other two filter an array in memory,
 * and neither has to know that about the other.
 *
 * The query lives with the caller for the same reason — it is what their
 * results are derived from — and everything that is purely about being a
 * combobox lives here.
 */
export function Combobox({
  query,
  onQueryChange,
  results,
  selectedLabel = "",
  isSelected,
  keyOf,
  onPick,
  // The clear button replaces the accessory only while something is selected,
  // which is the caller's fact to know, not something to infer from the label.
  clearable = false,
  onClear,
  label,
  listLabel,
  clearLabel,
  accessory = null,
  empty = null,
  footer = false,
  renderOption,
}) {
  const listboxId = useId();
  const optionId = (index) => `${listboxId}-opt-${index}`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // `query` is null until the reader types, so a selection made elsewhere (a
  // quick-pick chip) still shows in the field. The displayed value is both.
  const value = query ?? selectedLabel ?? "";

  // Derived rather than corrected in an effect: when the query narrows the
  // list, a stale index would point past the end and Enter would select
  // nothing. `activeIndex` is reset to 0 wherever the query changes.
  const active = results.length > 0 ? Math.min(activeIndex, results.length - 1) : 0;

  // Keep the active option in view during keyboard navigation.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => {
    setOpen(false);
    onQueryChange(null);
  }, [onQueryChange]);

  // Dismiss on any pointer press outside the whole control.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const commit = useCallback(
    (item) => {
      if (!item) return;
      onPick(item);
      onQueryChange(null);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onPick, onQueryChange],
  );

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => {
        const from = Math.min(index, results.length - 1);
        return (from + step + results.length) % results.length;
      });
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      if (!open || results.length === 0) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : results.length - 1);
      return;
    }

    if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      commit(results[active]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Tab" && open) close();
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-center gap-2.5 rounded-control border bg-surface px-3.5 transition-colors ${
          open ? "border-brand" : "border-rule"
        }`}
      >
        <Search className="size-4 shrink-0 text-muted" strokeWidth={2} />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results.length > 0 ? optionId(active) : undefined
          }
          aria-label={label}
          autoComplete="off"
          spellCheck={false}
          placeholder={label}
          value={value}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={(event) => {
            setOpen(true);
            event.target.select();
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-muted"
        />

        {clearable ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              onQueryChange(null);
              setOpen(false);
            }}
            aria-label={clearLabel}
            className="shrink-0 rounded-full p-1 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        ) : (
          accessory
        )}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-control border border-rule bg-surface shadow-card">
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={listLabel}
            className="max-h-72 overflow-y-auto"
          >
            {results.map((item, index) => (
              <li
                key={keyOf(item)}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected(item)}
                // Pointer, not click: the outside-press listener fires on
                // pointerdown, and a plain onClick would lose the race and
                // close before selecting.
                onPointerDown={(event) => {
                  event.preventDefault();
                  commit(item);
                }}
                onMouseMove={() => setActiveIndex(index)}
                className={`cursor-pointer border-b border-rule px-3.5 py-2.5 last:border-b-0 ${
                  index === active ? "bg-brand-wash" : ""
                }`}
              >
                {renderOption(item)}
              </li>
            ))}

            {results.length === 0 && empty}
          </ul>

          {footer && results.length > 0 && (
            <p className="border-t border-rule px-3.5 py-2 text-[11px] text-faint">
              ↑ ↓ to move · ↵ to select · esc to dismiss
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Underlines the matched prefix rather than colouring it — quieter. */
export function Marked({ runs }) {
  return runs.map((run, index) =>
    run.match ? (
      <mark
        key={index}
        className="bg-transparent font-medium text-ink underline decoration-ink/30 underline-offset-2"
      >
        {run.text}
      </mark>
    ) : (
      <span key={index}>{run.text}</span>
    ),
  );
}

/** The two-line row every picker uses: a marked name, then what tells two
 *  similar names apart. */
export function OptionRow({ title, aside, detail }) {
  return (
    <>
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{title}</span>
        {aside && (
          <span className="shrink-0 text-[11px] whitespace-nowrap text-muted">
            {aside}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">{detail}</p>
    </>
  );
}
