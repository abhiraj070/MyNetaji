"use client";

import { useMemo, useState } from "react";

import { Combobox, Marked, OptionRow } from "@/components/ui/Combobox";
import { highlight, searchMinistries } from "@/lib/ministries";

/**
 * Searchable ministry picker.
 *
 * The control itself is `Combobox`, shared with the state and MP pickers. What
 * is here is what is particular to portfolios: ~119 entries filtered in memory,
 * so results update on every keystroke with no network and no debounce, and a
 * row that reads portfolio · rank over minister · party.
 */
export function MinistryCombobox({ entries, selected, onSelect, onClear }) {
  // Null until the reader types, so a selection made elsewhere (a quick-pick
  // chip) still shows in the field.
  const [query, setQuery] = useState(null);
  const text = query ?? "";

  const results = useMemo(() => searchMinistries(entries, text), [entries, text]);

  return (
    <Combobox
      query={query}
      onQueryChange={setQuery}
      results={results}
      selectedLabel={selected?.label}
      isSelected={(entry) => selected?.id === entry.id}
      keyOf={(entry) => entry.id}
      onPick={onSelect}
      clearable={Boolean(selected)}
      onClear={onClear}
      label="Search a ministry or a Union Minister"
      listLabel="Ministries"
      clearLabel="Clear selected ministry"
      footer
      accessory={
        <span className="shrink-0 text-[11px] whitespace-nowrap text-faint">
          {text
            ? `${results.length} of ${entries.length}`
            : `${entries.length} portfolios`}
        </span>
      }
      empty={
        <li className="px-3.5 py-6 text-center text-sm text-muted">
          No ministry or Union Minister matches “{text}”.
        </li>
      }
      renderOption={(entry) => (
        <OptionRow
          title={<Marked runs={highlight(entry.label, text)} />}
          aside={entry.rank}
          detail={
            <>
              <Marked runs={highlight(entry.minister.minister_name, text)} />
              {entry.minister.party ? ` · ${entry.minister.party}` : ""}
            </>
          }
        />
      )}
    />
  );
}
