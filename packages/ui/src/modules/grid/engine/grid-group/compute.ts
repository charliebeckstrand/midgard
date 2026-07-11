import type { GridColumnGroup, GridGroupSpan } from '../../grid-group-types'
import { applyColumnReorder } from '../grid-reorder-compute'

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
