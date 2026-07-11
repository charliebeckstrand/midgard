'use client'

import {
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
	useDroppable,
} from '@dnd-kit/core'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { PaletteColor } from '../../core/recipe'
import { useSortableItem } from '../../hooks'
import {
	addGroupTo,
	assignColumn,
	buildManagerZones,
	groupIdFromDragId,
	isGroupDragId,
	moveBetweenZones,
	recolorGroupIn,
	removeGroupFrom,
	renameGroupIn,
	reorderGroups,
	settleDragEnd,
	type ZoneMap,
	zoneMapToStores,
} from './engine/grid-zone/map'
import type { GridColumnGroup } from './grid-group-types'
import type { GridColumnManagerItem } from './types'

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
			const id = String(event.active.id)

			setActiveId(id)

			// Only a column drag needs the live zone map; a group reorder is a plain
			// single-list sort committed on drop.
			if (!isGroupDragId(id)) setOverride(baseZoneMap)
		},
		[baseZoneMap],
	)

	const handleDragOver = useCallback(
		(event: DragOverEvent) => {
			const { active, over } = event

			if (!over || isGroupDragId(String(active.id))) return

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

			const activeStr = String(active.id)

			if (isGroupDragId(activeStr)) {
				// Reorder the whole group to the group it was dropped on.
				if (over) {
					onGroupsChange(
						reorderGroups(groups, groupIdFromDragId(activeStr), groupIdFromDragId(String(over.id))),
					)
				}
			} else if (over && override) {
				commit(settleDragEnd(override, activeStr, String(over.id)))
			}

			setOverride(null)

			setActiveId(null)
		},
		[override, commit, groups, onGroupsChange],
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
