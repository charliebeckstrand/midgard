'use client'

import { useCallback, useMemo, useState } from 'react'
import { useControllable } from '../../hooks'
import { useReportedChange } from '../../hooks/use-reported-change'
import { toggleItem } from '../../utilities'
import { buildGroupSpans, collapsedHiddenIds, groupByColumn } from './engine/grid-group/compute'
import type { GridGroupHeader, GridGroupResult } from './engine/grid-group/resolve'
import type { GridColumnGroup, GridColumnGroups, GridGroupSpan } from './grid-group-types'

/** Normalizes the {@link GridColumnGroups} prop (array shorthand or binding object) into `useControllable` inputs. @internal */
function resolveGroupsBinding(groups: GridColumnGroups | undefined): {
	value: GridColumnGroup[] | undefined
	defaultValue: GridColumnGroup[]
	onValueChange: ((groups: GridColumnGroup[]) => void) | undefined
} {
	// The array shorthand and the absent prop differ only in the seed.
	if (!groups || Array.isArray(groups))
		return { value: undefined, defaultValue: groups ?? [], onValueChange: undefined }

	return {
		value: groups.value,
		defaultValue: groups.defaultValue ?? [],
		onValueChange: groups.onValueChange,
	}
}

/**
 * Owns the grid's column-group slice: the controllable `groups` binding (array
 * shorthand or object binding). It also owns the collapse state, seeded once
 * from each group's `defaultCollapsed`, and the ids collapsed groups hide from
 * the engine. A `resolveHeader` maps the current visible columns into the
 * band-row {@link GridGroupSpan}s. Kept apart from the engine so `grid-data`
 * only wires it. That module feeds the grouped order (via
 * {@link groupedColumnOrder}) and `collapsedHidden` into the column slice, then
 * renders `resolveHeader` above the column header.
 *
 * @internal
 */
export function useGridGroup(
	groups: GridColumnGroups | undefined,
	onCollapsedChange?: (collapsed: ReadonlySet<string | number>) => void,
): GridGroupResult {
	const binding = resolveGroupsBinding(groups)

	const [controlledGroups, setGroups] = useControllable<GridColumnGroup[]>({
		value: binding.value,
		defaultValue: binding.defaultValue,
		onValueChange: (next) => binding.onValueChange?.(next ?? []),
	})

	const resolvedGroups = controlledGroups ?? binding.defaultValue

	// Collapse is grid-owned view state, not persisted through the groups binding;
	// seed it once from the initial groups' `defaultCollapsed` flags.
	const [collapsed, setCollapsed] = useState<ReadonlySet<string | number>>(
		() =>
			new Set(
				(binding.value ?? binding.defaultValue).filter((g) => g.defaultCollapsed).map((g) => g.id),
			),
	)

	const toggleCollapse = useCallback((id: string | number) => {
		setCollapsed((prev) => toggleItem(prev, id))
	}, [])

	// Read from the committed set rather than from `toggleCollapse`, because the set
	// is written through an updater. The seed above is the mount state, not a
	// transition, so a grid that mounts with a band already shut says nothing.
	useReportedChange(collapsed, onCollapsedChange)

	const collapsedHidden = useMemo(
		() => collapsedHiddenIds(resolvedGroups, collapsed),
		[resolvedGroups, collapsed],
	)

	const colToGroup = useMemo(() => groupByColumn(resolvedGroups), [resolvedGroups])

	const resolveHeader = useCallback(
		(
			visibleColumnIds: (string | number)[],
			pinnedSide: (id: string | number) => 'left' | 'right' | undefined,
		): GridGroupHeader => ({
			spans: buildGroupSpans(visibleColumnIds, colToGroup, pinnedSide),
			collapsed,
			onToggleCollapse: toggleCollapse,
		}),
		[colToGroup, collapsed, toggleCollapse],
	)

	const enabled = groups !== undefined

	return {
		enabled,
		hasGroups: resolvedGroups.length > 0,
		groups: resolvedGroups,
		setGroups,
		editorGroups: enabled ? resolvedGroups : undefined,
		editorSetGroups: enabled ? setGroups : undefined,
		collapsed,
		toggleCollapse,
		collapsedHidden,
		resolveHeader,
	}
}
