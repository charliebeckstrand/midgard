'use client'

import { useCallback, useMemo } from 'react'
import { useSortableList } from '../../hooks'
import { isDataColumn } from '../../utilities'
import type { GridReorder } from './grid-data-types'
import { isFrozen } from './grid-pin-overrides'
import type { GridColumn } from './types'

/** Stable drag id for a column. @internal */
const columnDragId = (col: { id: string | number }) => String(col.id)

/** Stable empty list so a non-reorderable table keeps a constant sortable `items` reference. @internal */
const EMPTY_COLUMNS: never[] = []

/**
 * Resolves the {@link GridReorder} prop to its two flags: `enabled` gates the
 * reorder wiring, `handle` picks the grip vs. whole-header drag affordance. The
 * boolean shorthand keeps the grip; the object form defaults `enabled` to `true`
 * (passing the object is the opt-in) and `handle` to `true`.
 *
 * @internal
 */
export function resolveGridReorder(reorder: boolean | GridReorder): {
	enabled: boolean
	handle: boolean
} {
	if (typeof reorder === 'boolean') return { enabled: reorder, handle: true }

	return { enabled: reorder.enabled ?? true, handle: reorder.handle ?? true }
}

/** Options for {@link useGridReorder}. @internal */
type GridReorderOptions<T> = {
	/** Whether header column reordering is enabled (the resolved {@link resolveGridReorder} `enabled`). */
	reorder: boolean
	/** The ordered, visible columns the header renders. */
	visibleColumns: GridColumn<T>[]
	/** Commits a header drag: the new order of the reorderable column ids. */
	reorderColumns: (reorderedIds: (string | number)[]) => void
	/** Fires with the dragged column's id when a reorder drag begins. */
	onReorderStart?: (columnId: string | number) => void
	/** Fires with the dragged column's id when a reorder drag ends (drop or cancel), after any commit. */
	onReorderEnd?: (columnId: string | number) => void
}

/**
 * Wires column reordering onto `@dnd-kit`'s horizontal sortable for
 * {@link Grid}. Only visible, non-frozen data columns are draggable (pinned and
 * locked columns hold their edge), and a lone draggable column has nowhere to
 * go, so `canReorder` gates the chrome on there being at least two. The data
 * table renders `<DndContext>` /
 * `<SortableContext>` from the returned props around the whole table region —
 * never the `<table>` itself, since the dnd context injects hidden
 * accessibility nodes that must not be `<table>` children.
 *
 * @returns `canReorder` (render gate) plus the `itemIds`, `strategy`,
 * `dndContextProps`, and `activeId` to spread onto the sortable context and
 * dnd context.
 * @internal
 */
export function useGridReorder<T>({
	reorder,
	visibleColumns,
	reorderColumns,
	onReorderStart,
	onReorderEnd,
}: GridReorderOptions<T>) {
	const draggableColumns = useMemo(
		() =>
			reorder ? visibleColumns.filter((col) => isDataColumn(col) && !isFrozen(col)) : EMPTY_COLUMNS,
		[reorder, visibleColumns],
	)

	const canReorder = reorder && draggableColumns.length > 1

	const handleReorder = useCallback(
		(next: GridColumn<T>[]) => reorderColumns(next.map((col) => col.id)),
		[reorderColumns],
	)

	const handleDragStart = useCallback(
		(col: GridColumn<T>) => onReorderStart?.(col.id),
		[onReorderStart],
	)

	const handleDragEnd = useCallback((col: GridColumn<T>) => onReorderEnd?.(col.id), [onReorderEnd])

	const { itemIds, strategy, dndContextProps, activeId } = useSortableList<GridColumn<T>>({
		items: draggableColumns,
		getKey: columnDragId,
		onReorder: canReorder ? handleReorder : undefined,
		orientation: 'horizontal',
		onDragStart: onReorderStart ? handleDragStart : undefined,
		onDragEnd: onReorderEnd ? handleDragEnd : undefined,
	})

	return { canReorder, itemIds, strategy, dndContextProps, activeId }
}
