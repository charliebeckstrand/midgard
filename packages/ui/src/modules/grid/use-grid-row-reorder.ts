'use client'

import { useCallback, useMemo } from 'react'
import type { SortableListOptions } from '../../hooks/use-sortable-list'
import type { GridRowReorder } from './grid-data-types'

/** A row paired with its stable key — the shape the vertical row sortable orders. @internal */
export type GridRowItem<T> = { row: T; key: string | number }

/** The drag id of a row item. @internal */
const rowItemKey = (item: GridRowItem<unknown>) => String(item.key)

/** Stable empty list so a non-reorderable grid keeps a constant sortable `items` reference. @internal */
const EMPTY_ITEMS: never[] = []

/** Options for {@link useGridRowReorder}. @internal */
type GridRowReorderOptions<T> = {
	/** The row-reorder binding, or `undefined` when the grid isn't row-reorderable. */
	rowReorder: GridRowReorder<T> | undefined
	/**
	 * Whether the grid's current state permits a manual row order: no active
	 * column sort, filter/search, pagination, virtualization, row grouping, or
	 * master-detail. The grid also has data and is not loading.
	 * The caller resolves this (it owns that state); the hook layers the binding's
	 * own gates (`disabled`, at least two rows) on top.
	 */
	enabled: boolean
	/** The rendered rows, parallel to {@link GridRowReorderOptions.rowKeys}. */
	rows: readonly T[]
	/** Each rendered row's stable key, parallel to {@link GridRowReorderOptions.rows}. */
	rowKeys: (string | number)[]
	/** Human-readable row name for the drag announcements; falls back to the row key. */
	rowLabel?: (row: T) => string
}

/**
 * Resolves row drag-reordering for {@link Grid}. Each rendered row is a
 * sortable item keyed by its row key. The drag and drop module gives the
 * returned `sortable` options to `useSortableList`, and renders the
 * `<DndContext>` around the table region and a `<SortableContext>` around the
 * body rows. The `<DndContext>` sits outside the `<table>`, whose children the
 * context's a11y nodes must not join. A drop commits the reordered rows through
 * the binding's `onReorder` and narrates the move.
 *
 * @returns `active` (whether reordering is live — the render gate) and the
 * `sortable` options of `@dnd-kit`'s vertical sortable.
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

	const items = useMemo<GridRowItem<T>[]>(
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
		(next: GridRowItem<T>[]) => onReorder?.(next.map((item) => item.row)),
		[onReorder],
	)

	const handleDragStart = useCallback(
		(item: GridRowItem<T>) => onReorderStart?.(item.key),
		[onReorderStart],
	)

	const handleDragEnd = useCallback(
		(item: GridRowItem<T>) => onReorderEnd?.(item.key),
		[onReorderEnd],
	)

	const sortable: SortableListOptions<GridRowItem<T>> = {
		items,
		getKey: rowItemKey,
		onReorder: canReorder ? handleReorder : undefined,
		orientation: 'vertical',
		onDragStart: onReorderStart ? handleDragStart : undefined,
		onDragEnd: onReorderEnd ? handleDragEnd : undefined,
		// Each drag step is announced by the row's name; the drag gives no visible text cue (WCAG 4.1.3).
		describe: (item) => rowLabel?.(item.row) ?? `row ${item.key}`,
	}

	return {
		/** Whether row reordering is live — the grid's render gate. */
		active: canReorder,
		/** The options of the vertical sortable, for the drag and drop module. */
		sortable,
	}
}
