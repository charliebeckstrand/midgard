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
	const byColumn = new Map<string | number, GridColumnGroup>()

	for (const group of groups) {
		for (const id of group.columns) {
			if (!byColumn.has(id)) byColumn.set(id, group)
		}
	}

	return byColumn
}

/**
 * Reorders the manager-controlled data columns so the grid matches the column
 * manager. The groups' members lead, in `groups` order then each group's own
 * `columns` order (the first group claims a shared column). The ungrouped
 * columns follow, in their incoming relative order. The resulting sequence is
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
 * The id that a header drag moved: the drag lifts one column and drops it in
 * another slot, so the two orders differ in one run. The run starts at the
 * column that left its slot (a drag forward) or ends at it (a drag back).
 *
 * @returns The moved id, or `undefined` when the orders are the same.
 * @internal
 */
function movedColumnId(
	prev: readonly (string | number)[],
	next: readonly (string | number)[],
): string | number | undefined {
	let start = 0

	while (start < prev.length && prev[start] === next[start]) start++

	if (start === prev.length) return undefined

	let end = prev.length - 1

	while (end > start && prev[end] === next[end]) end--

	return next[end] === prev[start] ? prev[start] : prev[end]
}

/**
 * Writes a header drag under column groups into the groups, so that the drop
 * holds in the grouped order (see {@link groupedColumnOrder}). A drag moves one
 * column. When it lands next to a member of its own group, it reorders the
 * members of that group. When it lands outside its group, the group moves as a
 * block. The block goes before the group that the column lands in when the drag
 * goes back, and after that group when the drag goes forward. The ungrouped
 * columns always follow the groups. Thus a block that lands among them goes to
 * the last place of the groups, and an ungrouped column reorders among the
 * ungrouped columns only. A member that the drag cannot reach (hidden, frozen,
 * or behind a collapse) holds its slot in its group.
 *
 * @param order - The full grouped column order.
 * @param groups - The current groups.
 * @param prev - The dragged ids in their order before the drag.
 * @param next - The same ids in their order after the drag.
 * @returns The next groups (the same array when no group changes), and the
 * next order with the ungrouped columns reordered. Pass the two to
 * {@link groupedColumnOrder} for the order that the grid shows.
 * @internal
 */
export function settleGroupedReorder(
	order: (string | number)[],
	groups: GridColumnGroup[],
	prev: readonly (string | number)[],
	next: (string | number)[],
): { groups: GridColumnGroup[]; order: (string | number)[] } {
	const moved = movedColumnId(prev, next)

	if (moved === undefined) return { groups, order }

	const byColumn = groupByColumn(groups)

	const group = byColumn.get(moved)

	if (!group) {
		const ungrouped = next.filter((id) => !byColumn.has(id))

		const slots = new Set(ungrouped)

		return { groups, order: applyColumnReorder(order, ungrouped, (id) => slots.has(id)) }
	}

	const to = next.indexOf(moved)

	const before = next[to - 1]

	const after = next[to + 1]

	const member = (id: string | number | undefined) => id !== undefined && byColumn.get(id) === group

	if (member(before) || member(after)) {
		const members = next.filter(member)

		const slots = new Set(members)

		const columns = applyColumnReorder(group.columns, members, (id) => slots.has(id))

		return {
			groups: groups.map((candidate) => (candidate === group ? { ...group, columns } : candidate)),
			order,
		}
	}

	const forward = to > prev.indexOf(moved)

	const neighbor = forward ? before : after

	const target = neighbor === undefined ? undefined : byColumn.get(neighbor)

	const rest = groups.filter((candidate) => candidate !== group)

	const index = target ? rest.indexOf(target) + (forward ? 1 : 0) : rest.length

	const reordered = [...rest.slice(0, index), group, ...rest.slice(index)]

	return {
		groups: reordered.every((candidate, i) => candidate === groups[i]) ? groups : reordered,
		order,
	}
}

/**
 * Column ids a collapsed group hides from the engine: every member that shows
 * but the first, which stays as the band's visible anchor and expand
 * affordance. A member that the reader hid, or that is pinned away from the
 * band, does not show, so it is neither the anchor nor counted as hidden by the
 * collapse. Absent groups and expanded groups contribute nothing.
 *
 * Only a {@link GridColumnGroup.collapsible} group collapses, because only its
 * band has the expand toggle. A group uses only the members that it owns under
 * {@link groupByColumn}. A shared column that an earlier group owns shows in
 * the band of that group, so it is not the anchor and the collapse does not
 * hide it.
 *
 * @param shows - Whether a column shows in the band when no group is collapsed.
 * @internal
 */
export function collapsedHiddenIds(
	groups: GridColumnGroup[],
	collapsed: ReadonlySet<string | number>,
	shows: (id: string | number) => boolean = () => true,
): Set<string | number> {
	const hidden = new Set<string | number>()

	const owner = groupByColumn(groups)

	for (const group of groups) {
		if (!group.collapsible || !collapsed.has(group.id)) continue

		const members = group.columns.filter((id) => owner.get(id) === group && shows(id))

		for (const id of members.slice(1)) hidden.add(id)
	}

	return hidden
}

/**
 * Walks the visible column ids in display order and splits them into
 * {@link GridGroupSpan}s. A `group` band covers each maximal contiguous run of
 * scrolling columns sharing a group, and a `plain` filler covers every ungrouped
 * or pinned column. A pinned column never joins a band, because it is
 * partitioned to an edge, away from its group. It always yields a `plain` span
 * the band row can stick to its edge.
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
