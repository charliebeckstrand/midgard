import type { PaletteColor } from '../../../../core/recipe'
import type { GridColumnGroup } from '../../grid-group-types'
import { applyColumnReorder } from '../grid-reorder-compute'

/** Moves an array item from one index to another, immutably (the dnd-kit `arrayMove` contract, without the dependency). @internal */
function moveItem<T>(items: T[], from: number, to: number): T[] {
	const next = [...items]

	next.splice(to, 0, ...next.splice(from, 1))

	return next
}

/** Sentinel zone id for the ungrouped column pool. @internal */
export const UNGROUPED = '__grid_ungrouped__'

/**
 * Prefix distinguishing a group's dnd id (reordering whole groups) from a
 * column's (moving columns within/between zones), so one `DndContext` carries
 * both sortables without id collisions.
 *
 * @internal
 */
export const GROUP_PREFIX = 'group:'

/** Whether a dnd id is a group-reorder id (vs a column id). @internal */
export function isGroupDragId(id: string): boolean {
	return id.startsWith(GROUP_PREFIX)
}

/** The group id carried by a {@link GROUP_PREFIX}-prefixed dnd id. @internal */
export function groupIdFromDragId(id: string): string {
	return id.slice(GROUP_PREFIX.length)
}

/**
 * Reorders the `groups` array, moving the group with `activeGroupId` to
 * `overGroupId`'s slot. Returns the array unchanged when either is missing or the
 * move is a no-op. Ids are compared stringified (dnd ids are strings).
 *
 * @internal
 */
export function reorderGroups(
	groups: GridColumnGroup[],
	activeGroupId: string,
	overGroupId: string,
): GridColumnGroup[] {
	const from = groups.findIndex((g) => String(g.id) === activeGroupId)

	const to = groups.findIndex((g) => String(g.id) === overGroupId)

	if (from === -1 || to === -1 || from === to) return groups

	return moveItem(groups, from, to)
}

/**
 * A live zone → member-id map. Keys are stringified zone ids (a group id or
 * {@link UNGROUPED}), values are stringified column ids in zone order — the flat
 * shape the drag layer mutates each pointer move and the dnd ids match.
 *
 * @internal
 */
export type ZoneMap = Record<string, string[]>

/** Appends a new group. @internal */
export function addGroupTo(groups: GridColumnGroup[], group: GridColumnGroup): GridColumnGroup[] {
	return [...groups, group]
}

/** Drops a group by id; its columns fall back to ungrouped. @internal */
export function removeGroupFrom(groups: GridColumnGroup[], id: string | number): GridColumnGroup[] {
	return groups.filter((g) => g.id !== id)
}

/** Sets a group's title. @internal */
export function renameGroupIn(
	groups: GridColumnGroup[],
	id: string | number,
	title: string,
): GridColumnGroup[] {
	return groups.map((g) => (g.id === id ? { ...g, title } : g))
}

/** Sets (or clears) a group's color. @internal */
export function recolorGroupIn(
	groups: GridColumnGroup[],
	id: string | number,
	color: PaletteColor | undefined,
): GridColumnGroup[] {
	return groups.map((g) => (g.id === id ? { ...g, color } : g))
}

/**
 * Moves a column into a group, or out to the ungrouped pool. The column is first
 * pulled from every group it currently sits in (so it lives in one group at
 * most), then appended to the target group's members unless `groupId` is `null`.
 * Empty groups after the pull are kept — the user may still be filling them.
 * Backs the accessible "Move to" menu (the drag path commits through
 * {@link zoneMapToStores}).
 *
 * @internal
 */
export function assignColumn(
	groups: GridColumnGroup[],
	columnId: string | number,
	groupId: string | number | null,
): GridColumnGroup[] {
	return groups.map((g) => {
		const without = g.columns.filter((id) => id !== columnId)

		if (g.id === groupId) return { ...g, columns: [...without, columnId] }

		if (without.length === g.columns.length) return g

		return { ...g, columns: without }
	})
}

/** A rendered zone in the group manager: a group, or the ungrouped pool. @internal */
export type GridGroupManagerZone = {
	/** The group's id, or {@link UNGROUPED} for the pool. */
	id: string | number
	/** The backing group, or `null` for the ungrouped pool. */
	group: GridColumnGroup | null
	/** Member column ids present in the orderable set, in zone order. */
	columnIds: (string | number)[]
}

/**
 * Partitions the orderable columns into zones: one per group (its members that
 * exist and aren't frozen, in the group's order) followed by the ungrouped pool
 * (the rest, in column order). A column claimed by no group lands in the pool.
 *
 * @internal
 */
export function buildManagerZones(
	groups: GridColumnGroup[],
	orderableIds: (string | number)[],
): GridGroupManagerZone[] {
	const orderable = new Set(orderableIds)

	const claimed = new Set<string | number>()

	const groupZones = groups.map((group) => {
		const columnIds = group.columns.filter((id) => orderable.has(id))

		for (const id of columnIds) claimed.add(id)

		return { id: group.id, group, columnIds }
	})

	const ungrouped = orderableIds.filter((id) => !claimed.has(id))

	return [...groupZones, { id: UNGROUPED, group: null, columnIds: ungrouped }]
}

/**
 * Resolves an id to its zone key: the zone whose id equals it (a drop on the
 * zone droppable itself — e.g. an empty zone), else the zone whose member list
 * contains it. `undefined` when it belongs to no zone.
 *
 * @internal
 */
export function findZoneId(map: ZoneMap, id: string): string | undefined {
	if (id in map) return id

	return Object.keys(map).find((zoneId) => map[zoneId]?.includes(id))
}

/**
 * Moves `activeStr` out of its zone and into `overStr`'s zone at the insertion
 * point — the end when dropping on the zone itself, else the over-item's slot,
 * nudged past it when the pointer is below the over-item's midpoint (`below`).
 * Returns the map unchanged (same reference) for a within-zone or invalid move,
 * so a no-op over-event skips the re-render. Drives the live cross-zone
 * re-parent in `onDragOver`.
 *
 * @internal
 */
export function moveBetweenZones(
	map: ZoneMap,
	activeStr: string,
	overStr: string,
	below: boolean,
): ZoneMap {
	const from = findZoneId(map, activeStr)

	const to = findZoneId(map, overStr)

	if (!from || !to || from === to) return map

	const fromIds = map[from] ?? []

	const toIds = map[to] ?? []

	if (!fromIds.includes(activeStr)) return map

	// Dropping on the zone itself appends; over a column inserts at its slot,
	// one past it when the pointer has crossed the column's midpoint.
	const overIndex = toIds.indexOf(overStr)

	const insertIndex =
		overStr === to || overIndex === -1 ? toIds.length : overIndex + (below ? 1 : 0)

	return {
		...map,
		[from]: fromIds.filter((id) => id !== activeStr),
		[to]: [...toIds.slice(0, insertIndex), activeStr, ...toIds.slice(insertIndex)],
	}
}

/**
 * Settles a same-zone reorder on drop (a cross-zone move already landed live in
 * `onDragOver`). Moves `activeStr` to `overStr`'s slot within their shared zone —
 * to the end when dropped on the zone id itself — or returns the map unchanged
 * for a cross-zone drop or a no-op.
 *
 * @internal
 */
export function settleDragEnd(map: ZoneMap, activeStr: string, overStr: string): ZoneMap {
	const from = findZoneId(map, activeStr)

	const to = findZoneId(map, overStr)

	if (!from || !to || from !== to) return map

	const ids = map[from] ?? []

	const oldIndex = ids.indexOf(activeStr)

	const newIndex = overStr === from ? ids.length - 1 : ids.indexOf(overStr)

	if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return map

	return { ...map, [from]: moveItem(ids, oldIndex, newIndex) }
}

/**
 * Translates a settled {@link ZoneMap} back into the group editor's two external
 * stores: each group's `columns` (membership + order, read straight from its
 * zone) and the ungrouped pool's order spliced back into the full column `order`
 * (holding grouped and frozen ids in place). One derivation covers both a
 * cross-zone membership change and a within-zone reorder, so the split commit
 * stays consistent.
 *
 * @internal
 */
export function zoneMapToStores(
	groups: GridColumnGroup[],
	order: (string | number)[],
	orderableIds: (string | number)[],
	map: ZoneMap,
): { groups: GridColumnGroup[]; order: (string | number)[] } {
	// The map carries stringified ids; resolve each back to its real column id
	// through a lookup built once, not a linear scan per id.
	const byString = new Map(orderableIds.map((c) => [String(c), c] as const))

	const realId = (id: string): string | number => byString.get(id) ?? id

	const nextGroups = groups.map((g) => ({ ...g, columns: (map[String(g.id)] ?? []).map(realId) }))

	const ungroupedIds = (map[UNGROUPED] ?? []).map(realId)

	const ungroupedSet = new Set(ungroupedIds)

	const nextOrder = applyColumnReorder(order, ungroupedIds, (id) => ungroupedSet.has(id))

	return { groups: nextGroups, order: nextOrder }
}
