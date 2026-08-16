"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Combobox, Marked, OptionRow } from "@/components/ui/Combobox";
import { useMpSearch } from "@/hooks/useMpSearch";
import { highlight } from "@/lib/ministries";
import { titleCase } from "@/lib/text";

/**
 * Searchable MP picker.
 *
 * The control itself is `Combobox`, shared with the state and ministry
 * pickers. The difference is underneath: 543 MPs is too many to ship to the
 * browser and filter locally the way the other two do, so results come from
 * the server as you type (see `useMpSearch` for the debounce and the
 * stale-response guarantee).
 *
 * That is also why this one has three states the others never have — waiting
 * to be typed in, searching, and failed. They are said in the row at the
 * bottom of the list and in the spinner where the others show a count, which
 * is the whole of what the async search costs the shared control: two props.
 */
export function MpCombobox({ selected, onSelect, onClear }) {
  const [query, setQuery] = useState(null);
  const text = query ?? "";

  const { results, isSearching, isError, isIdle, minQuery } = useMpSearch(text);

  return (
    <Combobox
      query={query}
      onQueryChange={setQuery}
      results={results}
      selectedLabel={selected?.name}
      isSelected={(mp) => selected?.id === mp.id}
      keyOf={(mp) => mp.id}
      onPick={onSelect}
      clearable={Boolean(selected)}
      onClear={onClear}
      label="Search an MP by name"
      listLabel="Members of Parliament"
      clearLabel="Clear selected MP"
      accessory={
        isSearching ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-faint" aria-hidden />
        ) : (
          <span className="shrink-0 text-[11px] whitespace-nowrap text-faint">
            {isIdle ? "543 MPs" : `${results.length} found`}
          </span>
        )
      }
      empty={
        <li className="px-3.5 py-6 text-center text-sm text-muted" aria-live="polite">
          {isError
            ? "Couldn't reach the search. Try again in a moment."
            : isIdle
              ? `Type at least ${minQuery} letters of an MP's name.`
              : isSearching
                ? "Searching…"
                : `No MP matches “${text}”.`}
        </li>
      }
      renderOption={(mp) => (
        <OptionRow
          title={<Marked runs={highlight(mp.name, text)} />}
          aside={mp.party}
          detail={titleCase(mp.constituency)}
        />
      )}
    />
  );
}
