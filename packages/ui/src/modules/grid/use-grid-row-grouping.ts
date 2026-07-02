'use client'

import type { ExpandedState } from '@tanstack/react-table'
import { useState } from 'react'
import { useControllable } from '../../hooks'
import type { GridGroupBy } from './grid-data-types'

/** Resolved row-grouping state for {@link useGridTable} and the grouped body. @internal */
type GridRowGroupingResult = {
	/** The grouped column id, or `null` when ungrouped (also `null` for an unknown/non-data id). */
	grouping: (string | number) | null
	/** Engine expansion state — which groups are open. */
	expanded: ExpandedState
	/** Commits an engine expansion change (a group-header toggle). */
	setExpanded: (next: ExpandedState) => void
	/** The group-header label override from the binding, if any. */
	renderHeader: GridGroupBy['renderHeader']
}

/**
 * Resolves the {@link GridGroupBy} binding into the grouping state the grid
 * runs on: the grouped column id (controllable, `null` when ungrouped), the
 * engine expansion state (seeded from `defaultExpanded`, then toggled per group
 * header), and the header-label override. Grouping is driven only by the
 * binding's `value`, so the grid never writes the grouped id back — the id is
 * effectively read-only here.
 *
 * A binding whose `value` names a column that isn't a groupable data column (or
 * is missing) resolves to `null`, so a stray id leaves the grid ungrouped rather
 * than grouping every row under one empty header.
 *
 * @param config - The `groupBy` binding, or `undefined` when the grid isn't grouped.
 * @param isGroupable - Whether a column id is a present, groupable data column.
 * @internal
 */
export function useGridRowGrouping(
	config: GridGroupBy | undefined,
	isGroupable: (id: string | number) => boolean,
): GridRowGroupingResult {
	const [grouping] = useControllable<(string | number) | null>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? null,
		onValueChange: (next) => config?.onValueChange?.(next ?? null),
	})

	const resolved = grouping != null && isGroupable(grouping) ? grouping : null

	const [expanded, setExpanded] = useState<ExpandedState>(
		config?.defaultExpanded === false ? {} : true,
	)

	return { grouping: resolved, expanded, setExpanded, renderHeader: config?.renderHeader }
}
