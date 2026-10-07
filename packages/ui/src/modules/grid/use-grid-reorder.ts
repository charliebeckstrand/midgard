'use client'

import { useCallback, useMemo } from 'react'
import type { SortableListOptions } from '../../hooks/use-sortable-list'
import { isDataColumn } from '../../utilities'
import { columnLabel } from './engine/grid-column/label'
import { isFrozen } from './engine/grid-pin/overrides'
import type { GridColumn } from './types'

/** Stable drag id for a column. @internal */
const columnDragId = (col: { id: string | number }) => String(col.id)

/** Stable empty list so a non-reorderable table keeps a constant sortable `items` reference. @internal */
const EMPTY_COLUMNS: never[] = []

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
 * Resolves column reordering for {@link Grid}. Only visible, non-frozen data
 * columns are draggable (pinned and locked columns hold their edge). A lone
 * draggable column has nowhere to go, so `canReorder` gates the chrome on there
 * being at least two. The drag and drop module gives the returned `sortable`
 * options to `useSortableList`, and renders `<DndContext>` / `<SortableContext>`
 * around the whole table region, never the `<table>` itself. The dnd context
 * injects hidden accessibility nodes that must not be `<table>` children.
 *
 * @returns `canReorder` (render gate) and the `sortable` options of
 * `@dnd-kit`'s horizontal sortable.
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

	const sortable: SortableListOptions<GridColumn<T>> = {
		items: draggableColumns,
		getKey: columnDragId,
		onReorder: canReorder ? handleReorder : undefined,
		orientation: 'horizontal',
		onDragStart: onReorderStart ? handleDragStart : undefined,
		onDragEnd: onReorderEnd ? handleDragEnd : undefined,
		describe: (col) => `${columnLabel(col)} column`,
	}

	return { canReorder, sortable }
}
