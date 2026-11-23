'use client'

import { useCallback, useMemo, useState } from 'react'
import { type ControllableBinding, useControllableBinding } from '../../hooks/use-controllable'
import { useReportedChange } from '../../hooks/use-reported-change'
import { toggleItem } from '../../utilities/toggle-item'
import { buildGroupSpans, groupByColumn } from './engine/grid-group/compute'
import type { GridGroupHeader, GridGroupResult } from './engine/grid-group/resolve'
import type { GridColumnGroup, GridColumnGroups, GridGroupSpan } from './grid-group-types'

/** No column groups. @internal */
const NO_GROUPS: GridColumnGroup[] = []

/** Normalizes the {@link GridColumnGroups} prop: the array shorthand seeds an uncontrolled binding. @internal */
function resolveGroupsBinding(
	groups: GridColumnGroups | undefined,
): ControllableBinding<GridColumnGroup[]> | undefined {
	return Array.isArray(groups) ? { defaultValue: groups } : groups
}

/**
 * Owns the grid's column-group slice: the controllable `groups` binding (array
 * shorthand or object binding). It also owns the collapse state, seeded once
 * from each group's `defaultCollapsed`. A `resolveHeader` maps the current
 * visible columns into the band-row {@link GridGroupSpan}s. Kept apart from the
 * engine so `grid-data` only wires it. That module feeds the groups and the
 * collapse state into the column slice, which resolves the order and the ids
 * that the collapse hides. It then renders `resolveHeader` above the column
 * header.
 *
 * @internal
 */
export function useGridGroup(
	groups: GridColumnGroups | undefined,
	onCollapsedChange?: (collapsed: ReadonlySet<string | number>) => void,
): GridGroupResult {
	const binding = resolveGroupsBinding(groups)

	const [resolvedGroups, setGroups] = useControllableBinding(binding, NO_GROUPS)

	// Collapse is grid-owned view state, not persisted through the groups binding;
	// seed it once from the initial groups' `defaultCollapsed` flags.
	const [collapsed, setCollapsed] = useState<ReadonlySet<string | number>>(
		() =>
			new Set(
				(binding?.value ?? binding?.defaultValue ?? NO_GROUPS)
					.filter((group) => group.defaultCollapsed)
					.map((group) => group.id),
			),
	)

	const toggleCollapse = useCallback((id: string | number) => {
		setCollapsed((prev) => toggleItem(prev, id))
	}, [])

	// Read from the committed set rather than from `toggleCollapse`, because the set
	// is written through an updater. The seed above is the mount state, not a
	// transition, so a grid that mounts with a band already shut says nothing.
	useReportedChange(collapsed, onCollapsedChange)

	const colToGroup = useMemo(() => groupByColumn(resolvedGroups), [resolvedGroups])

	const resolveHeader = useCallback(
		(
			visibleColumnIds: (string | number)[],
			pinnedSide: (id: string | number) => 'left' | 'right' | undefined,
			collapsedHidden: ReadonlySet<string | number>,
		): GridGroupHeader => ({
			spans: buildGroupSpans(visibleColumnIds, colToGroup, pinnedSide),
			collapsed,
			collapsedHidden,
			onToggleCollapse: toggleCollapse,
		}),
		[colToGroup, collapsed, toggleCollapse],
	)

	const enabled = groups !== undefined

	return {
		hasGroups: resolvedGroups.length > 0,
		groups: resolvedGroups,
		setGroups,
		editorGroups: enabled ? resolvedGroups : undefined,
		editorSetGroups: enabled ? setGroups : undefined,
		collapsed,
		resolveHeader,
	}
}
