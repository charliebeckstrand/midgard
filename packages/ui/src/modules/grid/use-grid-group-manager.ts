'use client'

import {
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
	useDroppable,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { PaletteColor } from '../../core/recipe'
import { useSortableItem } from '../../hooks'
import type { GridColumnGroup } from './grid-group-types'
import { applyColumnReorder } from './grid-reorder'
import type { GridColumnManagerItem } from './types'

/** Sentinel zone id for the ungrouped column pool. @internal */
export const UNGROUPED = '__grid_ungrouped__'

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

	return { ...map, [from]: arrayMove(ids, oldIndex, newIndex) }
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
	// The map carries stringified ids; resolve each back to its real column id.
	const realId = (id: string): string | number => orderableIds.find((c) => String(c) === id) ?? id

	const nextGroups = groups.map((g) => ({ ...g, columns: (map[String(g.id)] ?? []).map(realId) }))

	const ungroupedIds = (map[UNGROUPED] ?? []).map(realId)

	const ungroupedSet = new Set(ungroupedIds)

	const nextOrder = applyColumnReorder(order, ungroupedIds, (id) => ungroupedSet.has(id))

	return { groups: nextGroups, order: nextOrder }
}

/** Options for {@link useGridGroupManager}. @internal */
type GridGroupManagerOptions = {
	groups: GridColumnGroup[]
	onGroupsChange: (groups: GridColumnGroup[]) => void
	/** Orderable (non-frozen) data columns, in display order. */
	columns: GridColumnManagerItem[]
	/** Current column order; a within-ungrouped drag reorders it. */
	order: (string | number)[]
	/** Commits the next column order after a within-ungrouped reorder. */
	onOrderChange: (order: (string | number)[]) => void
}

/** Whether the dragged item sits below the over-item's vertical midpoint (for the insertion nudge). @internal */
function isBelowOverMidpoint(event: DragOverEvent): boolean {
	const overRect = event.over?.rect

	const translated = event.active.rect.current.translated

	return !!overRect && !!translated && translated.top > overRect.top + overRect.height / 2
}

/**
 * State and handlers for the column-manager's group editor. The zones (groups +
 * ungrouped pool) and the create/remove/rename/recolor/assign actions commit
 * through `onGroupsChange`. Dragging follows the house multi-container pattern
 * (see {@link Kanban}): a local {@link ZoneMap} override re-parents the active
 * column between zones live in `onDragOver` — so it never disappears and the
 * reflow animates — then `onDragEnd` settles the same-zone order and translates
 * the map back into the split stores via {@link zoneMapToStores}. `zoneMap` is
 * the render source (override while dragging, else derived from props);
 * `activeId` drives the drag overlay.
 *
 * @internal
 */
export function useGridGroupManager({
	groups,
	onGroupsChange,
	columns,
	order,
	onOrderChange,
}: GridGroupManagerOptions) {
	const baseId = useId()

	const idCounter = useRef(0)

	// The dragged column id (drives the overlay), and the live zone→ids override
	// that wins over the derived zones during a drag. Both null/absent when idle.
	const [activeId, setActiveId] = useState<string | null>(null)

	const [override, setOverride] = useState<ZoneMap | null>(null)

	const orderableIds = useMemo(() => columns.map((c) => c.id), [columns])

	const zones = useMemo(() => buildManagerZones(groups, orderableIds), [groups, orderableIds])

	// Zone→ids derived from props — the render source when idle, and the seed the
	// drag override starts from. Recomputed from the committed props after a drop,
	// so it equals the just-settled override (no flicker).
	const baseZoneMap = useMemo<ZoneMap>(
		() => Object.fromEntries(zones.map((z) => [String(z.id), z.columnIds.map(String)])),
		[zones],
	)

	const zoneMap = override ?? baseZoneMap

	const addGroup = useCallback(() => {
		idCounter.current += 1

		onGroupsChange(
			addGroupTo(groups, {
				id: `${baseId}-group-${idCounter.current}`,
				title: 'New group',
				columns: [],
			}),
		)
	}, [groups, onGroupsChange, baseId])

	const removeGroup = useCallback(
		(id: string | number) => onGroupsChange(removeGroupFrom(groups, id)),
		[groups, onGroupsChange],
	)

	const renameGroup = useCallback(
		(id: string | number, title: string) => onGroupsChange(renameGroupIn(groups, id, title)),
		[groups, onGroupsChange],
	)

	const recolorGroup = useCallback(
		(id: string | number, color: PaletteColor | undefined) =>
			onGroupsChange(recolorGroupIn(groups, id, color)),
		[groups, onGroupsChange],
	)

	const assign = useCallback(
		(columnId: string | number, groupId: string | number | null) =>
			onGroupsChange(assignColumn(groups, columnId, groupId)),
		[groups, onGroupsChange],
	)

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			setActiveId(String(event.active.id))

			setOverride(baseZoneMap)
		},
		[baseZoneMap],
	)

	const handleDragOver = useCallback(
		(event: DragOverEvent) => {
			const { active, over } = event

			if (!over) return

			const below = isBelowOverMidpoint(event)

			setOverride((prev) =>
				moveBetweenZones(prev ?? baseZoneMap, String(active.id), String(over.id), below),
			)
		},
		[baseZoneMap],
	)

	const commit = useCallback(
		(map: ZoneMap) => {
			const next = zoneMapToStores(groups, order, orderableIds, map)

			onGroupsChange(next.groups)

			onOrderChange(next.order)
		},
		[groups, order, orderableIds, onGroupsChange, onOrderChange],
	)

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event

			if (over && override) commit(settleDragEnd(override, String(active.id), String(over.id)))

			setOverride(null)

			setActiveId(null)
		},
		[override, commit],
	)

	const handleDragCancel = useCallback(() => {
		setOverride(null)

		setActiveId(null)
	}, [])

	return {
		zones,
		zoneMap,
		activeId,
		addGroup,
		removeGroup,
		renameGroup,
		recolorGroup,
		assign,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	}
}

/** Registers a droppable zone; returns the setter ref and whether a column hovers it. @internal */
export function useGroupZoneDroppable(zoneId: string | number) {
	const { setNodeRef, isOver } = useDroppable({ id: String(zoneId) })

	return { setNodeRef, isOver }
}

/**
 * Registers a sortable column row for the group editor. Delegates to the shared
 * {@link useSortableItem}, so the source row hides (`opacity: 0`) while dragging
 * and the editor's `<DragOverlay>` stands in — the same composition List and
 * Kanban use. `dragging` also gates the row's checkbox.
 *
 * @internal
 */
export function useGroupColumnSortable(columnId: string | number) {
	return useSortableItem({ id: String(columnId) })
}
