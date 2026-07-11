'use client'

import { useCallback, useMemo, useState } from 'react'
import { useControllable } from '../../hooks'
import { buildGroupSpans, collapsedHiddenIds, groupByColumn } from './engine/grid-group/compute'
import type { GridColumnGroup, GridColumnGroups, GridGroupSpan } from './grid-group-types'

/** Normalizes the {@link GridColumnGroups} prop (array shorthand or binding object) into `useControllable` inputs. @internal */
function resolveGroupsBinding(groups: GridColumnGroups | undefined): {
	value: GridColumnGroup[] | undefined
	defaultValue: GridColumnGroup[]
	onValueChange: ((groups: GridColumnGroup[]) => void) | undefined
} {
	if (!groups) return { value: undefined, defaultValue: [], onValueChange: undefined }

	if (Array.isArray(groups))
		return { value: undefined, defaultValue: groups, onValueChange: undefined }

	return {
		value: groups.value,
		defaultValue: groups.defaultValue ?? [],
		onValueChange: groups.onValueChange,
	}
}

/** The group-header model {@link GridHead} renders from: the resolved spans and the collapse controls. @internal */
export type GridGroupHeader = {
	spans: GridGroupSpan[]
	collapsed: ReadonlySet<string | number>
	onToggleCollapse: (id: string | number) => void
}

/** The grid's group slice returned by {@link useGridGroup}. @internal */
export type GridGroupResult = {
	/** Whether the `groups` prop was supplied at all (even empty); gates the manager's group editor. */
	enabled: boolean
	/** Whether at least one group is configured; gates the header band row. */
	hasGroups: boolean
	/** Resolved groups (controllable), the source of truth the manager mutates. */
	groups: GridColumnGroup[]
	setGroups: (next: GridColumnGroup[]) => void
	/** Groups for the manager's editor, or `undefined` when grouping is off — pre-gated so callers pass it straight through. */
	editorGroups: GridColumnGroup[] | undefined
	/** Commit sink for the manager's editor, paired with {@link GridGroupResult.editorGroups}. */
	editorSetGroups: ((next: GridColumnGroup[]) => void) | undefined
	collapsed: ReadonlySet<string | number>
	toggleCollapse: (id: string | number) => void
	/** Ids collapsed groups hide from the engine; union into `columnVisibility`. */
	collapsedHidden: Set<string | number>
	/** Resolves the band row for the current visible columns and their pin sides. */
	resolveHeader: (
		visibleColumnIds: (string | number)[],
		pinnedSide: (id: string | number) => 'left' | 'right' | undefined,
	) => GridGroupHeader
}

/**
 * Owns the grid's column-group slice: the controllable `groups` binding (array
 * shorthand or object binding), the grid-owned collapse state (seeded once from
 * each group's `defaultCollapsed`), the ids collapsed groups hide from the
 * engine, and a `resolveHeader` that maps the current visible columns into the
 * band-row {@link GridGroupSpan}s. Kept apart from the engine so `grid-data`
 * only wires it: it feeds the grouped order (via {@link groupedColumnOrder}) and
 * `collapsedHidden` into the column slice, then renders `resolveHeader` above the
 * column header.
 *
 * @internal
 */
export function useGridGroup(groups: GridColumnGroups | undefined): GridGroupResult {
	const binding = resolveGroupsBinding(groups)

	const [resolvedGroups = binding.defaultValue, setGroups] = useControllable<GridColumnGroup[]>({
		value: binding.value,
		defaultValue: binding.defaultValue,
		onValueChange: (next) => binding.onValueChange?.(next ?? []),
	})

	// Collapse is grid-owned view state, not persisted through the groups binding;
	// seed it once from the initial groups' `defaultCollapsed` flags.
	const [collapsed, setCollapsed] = useState<ReadonlySet<string | number>>(
		() =>
			new Set(
				(binding.value ?? binding.defaultValue).filter((g) => g.defaultCollapsed).map((g) => g.id),
			),
	)

	const toggleCollapse = useCallback((id: string | number) => {
		setCollapsed((prev) => {
			const next = new Set(prev)

			if (next.has(id)) next.delete(id)
			else next.add(id)

			return next
		})
	}, [])

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

	const setGroupsValue = useCallback((next: GridColumnGroup[]) => setGroups(next), [setGroups])

	const enabled = groups !== undefined

	return {
		enabled,
		hasGroups: resolvedGroups.length > 0,
		groups: resolvedGroups,
		setGroups: setGroupsValue,
		editorGroups: enabled ? resolvedGroups : undefined,
		editorSetGroups: enabled ? setGroupsValue : undefined,
		collapsed,
		toggleCollapse,
		collapsedHidden,
		resolveHeader,
	}
}
