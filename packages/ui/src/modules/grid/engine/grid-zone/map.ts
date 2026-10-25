import type { PaletteColor } from '../../../../core/recipe'
import { moveItem } from '../../../../utilities/move-item'
import type { GridColumnGroup } from '../../grid-group-types'
import { applyColumnReorder } from '../grid-reorder-compute'

/** Sentinel zone id for the ungrouped column pool. @internal */
export const UNGROUPED = '__grid_ungrouped__'

/**
 * Prefix distinguishing a group's dnd id (reordering whole groups) from a
 * column's (moving columns within/between zones), so one `DndContext` carries
 * both sortables without id collisions. A column id is free text, so the
 * prefix opens with a NUL, which no id holds: a column named `group:x` stays a
 * column.
 *
 * @internal
 */
export const GROUP_PREFIX = '\u0000group:'

/**
 * Prefix of a zone's droppable id, apart from the column ids for the same
 * reason as {@link GROUP_PREFIX}: a column whose id equals a group id drops at
 * its own slot, not into that group.
 *
 * @internal
 */
export const ZONE_PREFIX = '\u0000zone:'

/** The droppable id of a zone. @internal */
export function zoneDropId(zoneId: string | number): string {
	return `${ZONE_PREFIX}${zoneId}`
}

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
	const from = groups.findIndex((group) => String(group.id) === activeGroupId)

	const to = groups.findIndex((group) => String(group.id) === overGroupId)

	if (from === -1 || to === -1 || from === to) return groups

	return moveItem(groups, from, to)
}

/**
 * A live zone → member-id map. Keys are stringified zone ids (a group id or
 * {@link UNGROUPED}), and values are stringified column ids in zone order. It is
 * the flat shape the drag layer mutates each pointer move, and the dnd ids match.
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
	return groups.filter((group) => group.id !== id)
}

/** Sets a group's title. @internal */
export function renameGroupIn(
	groups: GridColumnGroup[],
	id: string | number,
	title: string,
): GridColumnGroup[] {
	return groups.map((group) => (group.id === id ? { ...group, title } : group))
}

/** Sets (or clears) a group's color. @internal */
export function recolorGroupIn(
	groups: GridColumnGroup[],
	id: string | number,
	color: PaletteColor | undefined,
): GridColumnGroup[] {
	return groups.map((group) => (group.id === id ? { ...group, color } : group))
}

/**
 * Moves a column into a group, or out to the ungrouped pool. The column is first
 * pulled from every group it currently sits in, so it lives in one group at
 * most. It is then appended to the target group's members, unless `groupId` is
 * `null`.
 * Empty groups after the pull are kept: the user can still add members to them.
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
	return groups.map((group) => {
		const without = group.columns.filter((id) => id !== columnId)

		if (group.id === groupId) return { ...group, columns: [...without, columnId] }

		if (without.length === group.columns.length) return group

		return { ...group, columns: without }
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
 * Partitions the orderable columns into zones: one per group, then the ungrouped
 * pool. A group's zone holds its members that exist and aren't frozen, in the
 * group's order. The pool holds the rest, in column order. A column claimed by
 * no group lands in the pool.
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
 * Resolves a dnd id to its zone key. A zone's droppable id (see
 * {@link zoneDropId}), on a drop on the zone itself such as an empty zone,
 * gives that zone. Otherwise it is the zone whose member list contains the id.
 * `undefined` when it belongs to no zone. The map is a plain object, so only
 * its own keys count: a column named `constructor` names no zone.
 *
 * @internal
 */
export function findZoneId(map: ZoneMap, id: string): string | undefined {
	if (id.startsWith(ZONE_PREFIX)) {
		const zoneId = id.slice(ZONE_PREFIX.length)

		return Object.hasOwn(map, zoneId) ? zoneId : undefined
	}

	return Object.keys(map).find((zoneId) => map[zoneId]?.includes(id))
}

/**
 * Moves `activeId` out of its zone and into `overId`'s zone, at the insertion
 * point. That point is the end when dropping on the zone itself, else the
 * over-item's slot. It is nudged past that slot when the pointer is below the
 * over-item's midpoint (`below`). Returns the map unchanged (same reference) for a within-zone or invalid move,
 * so a no-op over-event skips the re-render. Drives the live cross-zone
 * re-parent in `onDragOver`.
 *
 * @internal
 */
export function moveBetweenZones(
	map: ZoneMap,
	activeId: string,
	overId: string,
	below: boolean,
): ZoneMap {
	const from = findZoneId(map, activeId)

	const to = findZoneId(map, overId)

	if (!from || !to || from === to) return map

	const fromIds = map[from] ?? []

	const toIds = map[to] ?? []

	if (!fromIds.includes(activeId)) return map

	// Dropping on the zone itself appends; over a column inserts at its slot,
	// one past it when the pointer has crossed the column's midpoint.
	const overIndex = toIds.indexOf(overId)

	const insertIndex =
		overId === zoneDropId(to) || overIndex === -1 ? toIds.length : overIndex + (below ? 1 : 0)

	return {
		...map,
		[from]: fromIds.filter((id) => id !== activeId),
		[to]: toIds.toSpliced(insertIndex, 0, activeId),
	}
}

/**
 * Settles a same-zone reorder on drop (a cross-zone move already landed live in
 * `onDragOver`). Moves `activeId` to `overId`'s slot within their shared zone,
 * or to the end when dropped on the zone's droppable. It returns the map unchanged
 * for a cross-zone drop, or a no-op.
 *
 * @internal
 */
export function settleDragEnd(map: ZoneMap, activeId: string, overId: string): ZoneMap {
	const from = findZoneId(map, activeId)

	const to = findZoneId(map, overId)

	if (!from || !to || from !== to) return map

	const ids = map[from] ?? []

	const oldIndex = ids.indexOf(activeId)

	const newIndex = overId === zoneDropId(from) ? ids.length - 1 : ids.indexOf(overId)

	if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return map

	return { ...map, [from]: moveItem(ids, oldIndex, newIndex) }
}

/**
 * Walks the previous members of a group. A member that is not orderable holds
 * its slot, and each orderable slot takes the next id of the zone. The zone ids
 * left over append at the end.
 */
function mergeHeldMembers(
	prev: (string | number)[],
	zoneIds: (string | number)[],
	isOrderable: (id: string | number) => boolean,
): (string | number)[] {
	const next: (string | number)[] = []

	let index = 0

	for (const id of prev) {
		if (!isOrderable(id)) next.push(id)
		else if (index < zoneIds.length) next.push(zoneIds[index++] as string | number)
	}

	return [...next, ...zoneIds.slice(index)]
}

/**
 * Translates a settled {@link ZoneMap} back into the group editor's two external
 * stores. One is each group's `columns`: membership and order, read straight
 * from its zone. The other is the ungrouped pool's order, spliced back into the
 * full column `order`, holding grouped and frozen ids in place. One derivation covers both a
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
	const byString = new Map(orderableIds.map((id) => [String(id), id] as const))

	const realId = (id: string): string | number => byString.get(id) ?? id

	// A zone holds only the orderable members, so each other member (a pinned
	// column) keeps its slot in the group, as the "Move to" path keeps it.
	const isOrderable = (id: string | number) => byString.has(String(id))

	const nextGroups = groups.map((group) => ({
		...group,
		columns: mergeHeldMembers(
			group.columns,
			(map[String(group.id)] ?? []).map(realId),
			isOrderable,
		),
	}))

	const ungroupedIds = (map[UNGROUPED] ?? []).map(realId)

	const ungroupedSet = new Set(ungroupedIds)

	const nextOrder = applyColumnReorder(order, ungroupedIds, (id) => ungroupedSet.has(id))

	return { groups: nextGroups, order: nextOrder }
}
