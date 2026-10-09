'use client'

import { type Dispatch, type SetStateAction, useState } from 'react'
import { useControllable } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { toggleItem } from '../../utilities'
import { ALL_GROUPS_CLOSED, ALL_GROUPS_OPEN, type GroupExpansion } from './engine/grid-group/tree'
import type { GridGroupBy, GridGroupHeaderRow } from './grid-data-types'

/** Stable empty expanded-key set; read-only, replaced wholesale on change. @internal */
const EMPTY_EXPANDED: ReadonlySet<string | number> = new Set()

/** Resolved row-grouping state for {@link useGridTable} and the grouped body. @internal */
type GridRowGroupingResult<T> = {
	/** The grouped column id, or `null` when ungrouped (also `null` for an unknown/non-data id). */
	grouping: (string | number) | null
	/** Writes the grouped column id back through the binding — the group-by button's commit sink. */
	setGrouping: (next: (string | number) | null) => void
	/** Whether the binding runs server-side (`manual: true`). */
	manual: boolean
	/** Manual-mode group-header resolver, or `undefined` outside manual mode. */
	groupRow: ((row: T) => GridGroupHeaderRow | null) | undefined
	/** Which groups are open (client mode). */
	expanded: GroupExpansion
	/** Writes the client expansion state: a group toggle, or Expand all and Collapse all. */
	setExpanded: Dispatch<SetStateAction<GroupExpansion>>
	/** Expanded group keys (manual mode; controllable through the binding). */
	manualExpanded: ReadonlySet<string | number>
	/** Toggles a manual group's expansion, emitting `onExpandedChange` (and `onGroupExpand` when opening). */
	toggleGroup: (key: string | number) => void
	/** The group-header label override from the binding, if any. */
	renderHeader: GridGroupBy['renderHeader']
}

/**
 * Resolves the {@link GridGroupBy} binding into the grouping state the grid
 * runs on:
 *
 * - the grouped column id, controllable — the group-by button writes it back
 *   through `setGrouping`
 * - the client-mode engine expansion state, seeded from a boolean
 *   `defaultExpanded`, then toggled per group header
 * - the manual-mode expanded key set, controllable and seeded from a `Set`
 *   `defaultExpanded`, with its lazy-load-aware toggle
 * - the header-label override
 *
 * A binding whose `value` names a column that isn't a groupable data column (or
 * is missing) resolves to `null`. A stray id therefore leaves the grid
 * ungrouped, rather than grouping every row under one empty header.
 *
 * @param config - The `groupBy` binding, or `undefined` when the grid isn't grouped.
 * @param isGroupable - Whether a column id is a present, groupable data column.
 * @internal
 */
export function useGridRowGrouping<T>(
	config: GridGroupBy<T> | undefined,
	isGroupable: (id: string | number) => boolean,
): GridRowGroupingResult<T> {
	const [grouping, setGrouping] = useControllable<(string | number) | null>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? null,
		onValueChange: (next) => config?.onValueChange?.(next ?? null),
	})

	const resolved = grouping != null && isGroupable(grouping) ? grouping : null

	const [expanded, setExpanded] = useState<GroupExpansion>(
		config?.defaultExpanded === false ? ALL_GROUPS_CLOSED : ALL_GROUPS_OPEN,
	)

	// Manual expansion is a key set, not engine state: the groups live on the
	// server, so a boolean default can't enumerate them — a `Set` default seeds
	// the open groups, and anything else starts fully collapsed.
	const [manualExpanded = EMPTY_EXPANDED, setManualExpanded] = useControllable<
		ReadonlySet<string | number>
	>({
		value: config?.expanded,
		defaultValue: config?.defaultExpanded instanceof Set ? config.defaultExpanded : EMPTY_EXPANDED,
		onValueChange: (next) => config?.onExpandedChange?.(new Set(next ?? [])),
	})

	// The toggle reads the newest set and the newest lazy-load callback, and its
	// identity holds across expansion changes, so the group rows stay memoizable.
	// The updater form reads the set that a toggle earlier in the same batch
	// wrote. The binding resolves it at once, so `expanding` is set on return.
	const toggleGroup = useStableEvent((key: string | number) => {
		let expanding = false

		setManualExpanded((previous) => {
			const open = previous ?? EMPTY_EXPANDED

			expanding = !open.has(key)

			return toggleItem(open, key)
		})

		// The lazy-load hook fires only as a group opens — collapse keeps the
		// already-fetched children in place.
		if (expanding) config?.onGroupExpand?.(key)
	})

	return {
		grouping: resolved,
		setGrouping,
		manual: config?.manual === true,
		groupRow: config?.manual === true ? config.groupRow : undefined,
		expanded,
		setExpanded,
		manualExpanded,
		toggleGroup,
		renderHeader: config?.renderHeader,
	}
}
