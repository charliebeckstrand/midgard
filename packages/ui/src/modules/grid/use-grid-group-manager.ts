'use client'

import { type DragEndEvent, useDroppable } from '@dnd-kit/core'
import { arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type CSSProperties, useCallback, useId, useMemo, useRef } from 'react'
import type { PaletteColor } from '../../core/recipe'
import type { GridColumnGroup } from './grid-group-types'
import { applyColumnReorder } from './grid-reorder'
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

/** Replaces a group's member order with `columns`, backing a within-group drag reorder. @internal */
export function setGroupColumnsIn(
	groups: GridColumnGroup[],
	id: string | number,
	columns: (string | number)[],
): GridColumnGroup[] {
	return groups.map((g) => (g.id === id ? { ...g, columns } : g))
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
 * Locates the zone a drag started in and the zone it was dropped on (a zone
 * directly, or the zone owning the column dropped on), or `null` when either is
 * missing.
 *
 * @internal
 */
export function locateDropZones(
	zones: GridGroupManagerZone[],
	activeStr: string,
	overStr: string,
): { sourceZone: GridGroupManagerZone; targetZone: GridGroupManagerZone } | null {
	const sourceZone = zones.find((z) => z.columnIds.some((id) => String(id) === activeStr))

	const targetZone =
		zones.find((z) => String(z.id) === overStr) ??
		zones.find((z) => z.columnIds.some((id) => String(id) === overStr))

	if (!sourceZone || !targetZone) return null

	return { sourceZone, targetZone }
}

/**
 * The zone's member ids after moving `activeStr` to where `overStr` sits (or to
 * the end when dropped on the zone itself), or `null` when the move is a no-op.
 *
 * @internal
 */
export function reorderZoneColumns(
	zone: GridGroupManagerZone,
	activeStr: string,
	overStr: string,
): (string | number)[] | null {
	const oldIndex = zone.columnIds.findIndex((id) => String(id) === activeStr)

	const newIndex =
		overStr === String(zone.id)
			? zone.columnIds.length - 1
			: zone.columnIds.findIndex((id) => String(id) === overStr)

	if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return null

	return arrayMove(zone.columnIds, oldIndex, newIndex)
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

/**
 * State and handlers for the column-manager's group editor: the zones (groups +
 * ungrouped pool), the create/remove/rename/recolor and column-assignment
 * actions (each a pure reducer committed through `onGroupsChange`), and the
 * dnd-kit drag wiring. A drag within a zone reorders it — a group's member order
 * through `onGroupsChange`, the ungrouped pool's through `onOrderChange`; a drag
 * across zones changes the column's membership.
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

	const orderableIds = useMemo(() => columns.map((c) => c.id), [columns])

	const zones = useMemo(() => buildManagerZones(groups, orderableIds), [groups, orderableIds])

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

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event

			if (!over) return

			const activeStr = String(active.id)

			// Resolve the drag id (stringified) back to a real column id.
			const realId = orderableIds.find((id) => String(id) === activeStr)

			if (realId === undefined) return

			const located = locateDropZones(zones, activeStr, String(over.id))

			if (!located) return

			const { sourceZone, targetZone } = located

			// Across zones: change the column's membership (append into the target
			// group, or drop it back to the ungrouped pool); order is re-derived.
			if (String(sourceZone.id) !== String(targetZone.id)) {
				assign(realId, targetZone.group ? targetZone.group.id : null)

				return
			}

			// Within a zone: reorder its members.
			const nextIds = reorderZoneColumns(sourceZone, activeStr, String(over.id))

			if (!nextIds) return

			if (sourceZone.group) {
				onGroupsChange(setGroupColumnsIn(groups, sourceZone.group.id, nextIds))

				return
			}

			// The ungrouped pool lives in the column order: splice the reordered
			// ungrouped ids back into the full order, holding every other id in place.
			const ungroupedSet = new Set(sourceZone.columnIds)

			onOrderChange(applyColumnReorder(order, nextIds, (id) => ungroupedSet.has(id)))
		},
		[zones, orderableIds, groups, order, onGroupsChange, onOrderChange, assign],
	)

	return {
		zones,
		addGroup,
		removeGroup,
		renameGroup,
		recolorGroup,
		assign,
		handleDragEnd,
	}
}

/** Registers a droppable zone; returns the setter ref and whether a column hovers it. @internal */
export function useGroupZoneDroppable(zoneId: string | number) {
	const { setNodeRef, isOver } = useDroppable({ id: String(zoneId) })

	return { setNodeRef, isOver }
}

/**
 * Registers a sortable column row for the group editor. Unlike the shared
 * {@link useSortableItem} — which hides the source row (`opacity: 0`) for a
 * `<DragOverlay>` to stand in — this keeps the row visible and animates it in
 * place through the sortable transform/transition, so siblings glide aside and
 * the dragged row settles into its slot rather than snapping. `dragging` lifts
 * the row above its siblings and gates its checkbox.
 *
 * @internal
 */
export function useGroupColumnSortable(columnId: string | number) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: String(columnId) })

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 1 : undefined,
		position: isDragging ? 'relative' : undefined,
	}

	return { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging: isDragging }
}
