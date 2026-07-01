'use client'

import { type DragEndEvent, type DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { PaletteColor } from '../../core/recipe'
import type { GridColumnGroup } from './grid-group-types'
import type { GridColumnManagerItem } from './types'

/** Sentinel zone id for the ungrouped column pool. @internal */
export const UNGROUPED = '__grid_ungrouped__'

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

/** Options for {@link useGridGroupManager}. @internal */
type GridGroupManagerOptions = {
	groups: GridColumnGroup[]
	onGroupsChange: (groups: GridColumnGroup[]) => void
	/** Orderable (non-frozen) data columns, in display order. */
	columns: GridColumnManagerItem[]
}

/**
 * State and handlers for the column-manager's group editor: the zones (groups +
 * ungrouped pool), the create/remove/rename/recolor and column-assignment
 * actions (each a pure reducer committed through `onGroupsChange`), and the
 * dnd-kit drag wiring that moves a column between zones on drop. A dragged
 * column joins the zone it is dropped on (a zone, or another column's zone);
 * dropping it back on its own zone is a no-op.
 *
 * @internal
 */
export function useGridGroupManager({ groups, onGroupsChange, columns }: GridGroupManagerOptions) {
	const baseId = useId()

	const idCounter = useRef(0)

	const [activeId, setActiveId] = useState<string | null>(null)

	const orderableIds = useMemo(() => columns.map((c) => c.id), [columns])

	const zones = useMemo(() => buildManagerZones(groups, orderableIds), [groups, orderableIds])

	// Column id → its zone id, for resolving a drop onto another column.
	const columnZone = useMemo(() => {
		const map = new Map<string | number, string | number>()

		for (const zone of zones) {
			for (const id of zone.columnIds) map.set(id, zone.id)
		}

		return map
	}, [zones])

	const titleById = useMemo(() => {
		const map = new Map<string | number, GridColumnManagerItem>()

		for (const col of columns) map.set(col.id, col)

		return map
	}, [columns])

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

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(String(event.active.id))
	}, [])

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveId(null)

			const { active, over } = event

			if (!over) return

			const columnId = String(active.id)

			// Resolve the id back to a real column id (the drag id is stringified).
			const realId = orderableIds.find((id) => String(id) === columnId)

			if (realId === undefined) return

			const overId = String(over.id)

			// The drop target is a zone directly, or the zone owning the column dropped on.
			const targetZone =
				zones.find((z) => String(z.id) === overId) ??
				zones.find((z) => z.columnIds.some((id) => String(id) === overId))

			if (!targetZone) return

			if (String(columnZone.get(realId)) === String(targetZone.id)) return

			assign(realId, targetZone.group ? targetZone.group.id : null)
		},
		[zones, columnZone, orderableIds, assign],
	)

	const handleDragCancel = useCallback(() => setActiveId(null), [])

	return {
		zones,
		activeId,
		titleById,
		addGroup,
		removeGroup,
		renameGroup,
		recolorGroup,
		assign,
		handleDragStart,
		handleDragEnd,
		handleDragCancel,
	}
}

/** Registers a droppable zone; returns the setter ref and whether a column hovers it. @internal */
export function useGroupZoneDroppable(zoneId: string | number) {
	const { setNodeRef, isOver } = useDroppable({ id: String(zoneId) })

	return { setNodeRef, isOver }
}

/** Registers a draggable column row; returns the dnd wiring for its node and grip. @internal */
export function useGroupColumnDraggable(columnId: string | number) {
	const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: String(columnId) })

	return { setNodeRef, attributes, listeners, isDragging }
}
