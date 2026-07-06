'use client'

import { useCallback, useMemo, useState } from 'react'
import { useControllable } from '../../hooks'
import type { GridColumnGroup, GridColumnGroups, GridGroupSpan } from './grid-group-types'
import { applyColumnReorder } from './grid-reorder'

/**
 * Maps each grouped column id to its {@link GridColumnGroup}. The first group to
 * claim a column wins, so a column listed in two groups binds to the earlier one
 * rather than splitting.
 *
 * @internal
 */
export function groupByColumn(groups: GridColumnGroup[]): Map<string | number, GridColumnGroup> {
	const map = new Map<string | number, GridColumnGroup>()

	for (const group of groups) {
		for (const id of group.columns) {
			if (!map.has(id)) map.set(id, group)
		}
	}

	return map
}

/**
 * Reorders the manager-controlled data columns so the grid matches the column
 * manager: the groups' members lead, in `groups` order then each group's own
 * `columns` order (the first group claims a shared column), followed by the
 * ungrouped columns in their incoming relative order. The resulting sequence is
 * spliced back into the orderable-data slots of `order`, holding selection,
 * actions, and frozen columns in place. `isOrderable` marks a manager-controlled
 * column (a non-frozen data column). Idempotent: a grouped order maps to itself,
 * so it is safe to feed the engine every render.
 *
 * @internal
 */
export function groupedColumnOrder(
	order: (string | number)[],
	groups: GridColumnGroup[],
	isOrderable: (id: string | number) => boolean,
): (string | number)[] {
	if (groups.length === 0) return order

	const claimed = new Set<string | number>()

	const grouped: (string | number)[] = []

	for (const group of groups) {
		for (const id of group.columns) {
			if (isOrderable(id) && !claimed.has(id)) {
				claimed.add(id)

				grouped.push(id)
			}
		}
	}

	const ungrouped = order.filter((id) => isOrderable(id) && !claimed.has(id))

	return applyColumnReorder(order, [...grouped, ...ungrouped], isOrderable)
}

/**
 * Column ids a collapsed group hides from the engine: every member but the
 * first, which stays as the band's visible anchor and expand affordance. Absent
 * groups and expanded groups contribute nothing.
 *
 * @internal
 */
export function collapsedHiddenIds(
	groups: GridColumnGroup[],
	collapsed: ReadonlySet<string | number>,
): Set<string | number> {
	const hidden = new Set<string | number>()

	for (const group of groups) {
		if (!collapsed.has(group.id)) continue

		for (const id of group.columns.slice(1)) hidden.add(id)
	}

	return hidden
}

/**
 * Walks the visible column ids in display order and splits them into
 * {@link GridGroupSpan}s: a `group` band over each maximal contiguous run of
 * scrolling columns sharing a group, and a `plain` filler over every ungrouped
 * or pinned column. A pinned column never joins a band (it is partitioned to an
 * edge, away from its group), so it always yields a `plain` span the band row
 * can stick to its edge.
 *
 * @internal
 */
export function buildGroupSpans(
	visibleColumnIds: (string | number)[],
	colToGroup: Map<string | number, GridColumnGroup>,
	pinnedSide: (id: string | number) => 'left' | 'right' | undefined,
): GridGroupSpan[] {
	const spans: GridGroupSpan[] = []

	let i = 0

	while (i < visibleColumnIds.length) {
		const id = visibleColumnIds[i] as string | number

		const group = pinnedSide(id) ? undefined : colToGroup.get(id)

		if (!group) {
			spans.push({ kind: 'plain', colSpan: 1, leadColumnId: id })

			i += 1

			continue
		}

		let j = i + 1

		while (
			j < visibleColumnIds.length &&
			!pinnedSide(visibleColumnIds[j] as string | number) &&
			colToGroup.get(visibleColumnIds[j] as string | number)?.id === group.id
		) {
			j += 1
		}

		spans.push({ kind: 'group', group, colSpan: j - i, leadColumnId: id })

		i = j
	}

	return spans
}

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
