"use client";

import { useMemo, useState } from "react";

import { Combobox, Marked, OptionRow } from "@/components/ui/Combobox";
import { highlight } from "@/lib/ministries";
import { searchCms } from "@/lib/chiefMinisters";

/**
 * Searchable Chief Minister picker.
 *
 * The control itself is `Combobox`, shared with the ministry and MP pickers so
 * switching tabs in the Search sheet doesn't hand the reader a new thing to
 * learn. What is here is what is particular to states: 31 flat rows filtered in
 * memory, and a row that reads name · party over state.
 */
export function CmCombobox({ cms, selected, onSelect, onClear }) {
  // Null until the reader types: not typing means no filter, so the whole list
  // shows rather than the single entry matching the selection's own name.
  const [query, setQuery] = useState(null);
  const text = query ?? "";

  const results = useMemo(() => searchCms(cms, text), [cms, text]);

  return (
    <Combobox
      query={query}
      onQueryChange={setQuery}
      results={results}
      selectedLabel={selected?.name}
      isSelected={(cm) => selected?.state_key === cm.state_key}
      keyOf={(cm) => cm.state_key}
      onPick={onSelect}
      clearable={Boolean(selected)}
      onClear={onClear}
      label="Search a state or a Chief Minister"
      listLabel="Chief Ministers"
      clearLabel="Clear selected Chief Minister"
      footer
      accessory={
        <span className="shrink-0 text-[11px] whitespace-nowrap text-faint">
          {text ? `${results.length} of ${cms.length}` : `${cms.length} states`}
        </span>
      }
      empty={
        <li className="px-3.5 py-6 text-center text-sm text-muted">
          No state or Chief Minister matches “{text}”.
        </li>
      }
      renderOption={(cm) => (
        <OptionRow
          title={<Marked runs={highlight(cm.name, text)} />}
          aside={cm.party}
          detail={<Marked runs={highlight(cm.state, text)} />}
        />
      )}
    />
  );
}
