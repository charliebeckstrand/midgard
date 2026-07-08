'use client'

import { useCallback, useMemo } from 'react'
import { announce } from '../../core'
import { useSortableList } from '../../hooks'
import { describeRowReorder } from './grid-announcements'
import type { GridRowReorder } from './grid-data-types'

/** A row paired with its stable key — the shape the vertical row sortable orders. @internal */
type RowItem<T> = { row: T; key: string | number }

/** Stable empty list so a non-reorderable grid keeps a constant sortable `items` reference. @internal */
const EMPTY_ITEMS: never[] = []

/** Options for {@link useGridRowReorder}. @internal */
type GridRowReorderOptions<T> = {
	/** The row-reorder binding, or `undefined` when the grid isn't row-reorderable. */
	rowReorder: GridRowReorder<T> | undefined
	/**
	 * Whether the grid's current state permits a manual row order: no active
	 * column sort, filter/search, pagination, or virtualization, and it has data.
	 * The caller resolves this (it owns that state); the hook layers the binding's
	 * own gates (`disabled`, at least two rows) on top.
	 */
	enabled: boolean
	/** The rendered rows, parallel to {@link GridRowReorderOptions.rowKeys}. */
	rows: T[]
	/** Each rendered row's stable key, parallel to {@link GridRowReorderOptions.rows}. */
	rowKeys: (string | number)[]
	/** Human-readable row name for the drop announcement; falls back to the row key. */
	rowLabel?: (row: T) => string
}

/** The moved row's new 1-based position and its name, for the drop announcement. @internal */
function describeMove<T>(
	prev: RowItem<T>[],
	next: RowItem<T>[],
	rowLabel: ((row: T) => string) | undefined,
): { name: string; position: number } | null {
	const oldIndex = new Map(prev.map((item, index) => [item.key, index] as const))

	// The dragged row is the one displaced farthest from its old slot — the rows
	// it passed each shift by one, so its own move is the largest (ties on an
	// adjacent swap, where either row's new position reads correctly).
	let movedIndex = -1

	let maxDelta = 0

	for (let index = 0; index < next.length; index++) {
		const from = oldIndex.get((next[index] as RowItem<T>).key)

		if (from === undefined) continue

		const delta = Math.abs(index - from)

		if (delta > maxDelta) {
			maxDelta = delta

			movedIndex = index
		}
	}

	if (movedIndex === -1) return null

	const moved = next[movedIndex] as RowItem<T>

	return { name: rowLabel?.(moved.row) ?? `row ${moved.key}`, position: movedIndex + 1 }
}

/**
 * Wires row drag-reordering onto `@dnd-kit`'s vertical sortable for {@link Grid}.
 * Each rendered row is a sortable item keyed by its row key; the enclosing grid
 * renders the `<DndContext>` from the returned `dndContextProps` around the
 * table region (outside the `<table>`, whose children the context's a11y nodes
 * must not join) and a `<SortableContext>` around the body rows. A drop commits
 * the reordered rows through the binding's `onReorder` and narrates the move.
 *
 * @returns `active` (whether reordering is live — the render gate), plus the
 * `itemIds`, `strategy`, `dndContextProps`, and `activeId` for the sortable and
 * dnd contexts.
 * @internal
 */
export function useGridRowReorder<T>({
	rowReorder,
	enabled,
	rows,
	rowKeys,
	rowLabel,
}: GridRowReorderOptions<T>) {
	const canReorder = enabled && !!rowReorder && !rowReorder.disabled && rows.length > 1

	const items = useMemo<RowItem<T>[]>(
		() =>
			canReorder
				? rows.map((row, index) => ({ row, key: rowKeys[index] as string | number }))
				: EMPTY_ITEMS,
		[canReorder, rows, rowKeys],
	)

	const onReorder = rowReorder?.onReorder

	const onReorderStart = rowReorder?.onReorderStart

	const onReorderEnd = rowReorder?.onReorderEnd

	const handleReorder = useCallback(
		(next: RowItem<T>[]) => {
			onReorder?.(next.map((item) => item.row))

			// Narrate the settled move; the drag gives no visible text cue (WCAG 4.1.3).
			const move = describeMove(items, next, rowLabel)

			if (move) announce(describeRowReorder(move.name, move.position, next.length))
		},
		[onReorder, items, rowLabel],
	)

	const handleDragStart = useCallback(
		(item: RowItem<T>) => onReorderStart?.(item.key),
		[onReorderStart],
	)

	const handleDragEnd = useCallback((item: RowItem<T>) => onReorderEnd?.(item.key), [onReorderEnd])

	const { itemIds, strategy, dndContextProps, activeId } = useSortableList<RowItem<T>>({
		items,
		getKey: (item) => String(item.key),
		onReorder: canReorder ? handleReorder : undefined,
		orientation: 'vertical',
		onDragStart: onReorderStart ? handleDragStart : undefined,
		onDragEnd: onReorderEnd ? handleDragEnd : undefined,
	})

	return {
		/** Whether row reordering is live — the grid's render gate. */
		active: canReorder,
		/** dnd-kit context props for the `<DndContext>` the grid renders outside the `<table>`. */
		dndContextProps,
		/** Id of the row being dragged, or `null`. */
		activeId,
		/**
		 * The vertical sortable's `items`/`strategy` for the body's `SortableContext`,
		 * or `null` when reordering is inactive — spread straight onto the grid body.
		 */
		sortableContext: canReorder ? { itemIds, strategy } : null,
	}
}
