'use client'

import { useCallback, useMemo } from 'react'
import { isDataColumn } from '../../utilities'
import type { GridColumnManagerConfig, GridColumnOrder } from './grid-data-types'
import { applyColumnReorder } from './grid-reorder'
import type { GridColumn, GridColumnManagerItem } from './types'
import { useGridColumnVisibility } from './use-grid-column-visibility'

/**
 * The engine's `columnVisibility` state ({ id: false }) for the hidden columns —
 * only hideable ones, so non-data and pinned columns are never marked hidden
 * (they always show). Columns absent from the map default to visible.
 *
 * @internal
 */
function toColumnVisibility<T>(
	hiddenColumns: Set<string | number>,
	columnById: Map<string | number, GridColumn<T>>,
): Record<string, boolean> {
	const visibility: Record<string, boolean> = {}

	for (const id of hiddenColumns) {
		const col = columnById.get(id)

		if (col && isDataColumn(col) && !col.pinned) visibility[String(id)] = false
	}

	return visibility
}

/** Options for {@link useGridColumns}. @internal */
type GridColumnsOptions<T> = {
	columns: GridColumn<T>[]
	columnOrderConfig?: GridColumnOrder
	columnManagerConfig: GridColumnManagerConfig | undefined
}

/** Column slice returned by {@link useGridColumns}. @internal */
type GridColumnsResult = {
	columnOrder: (string | number)[]
	setColumnOrder: (next: (string | number)[]) => void
	hiddenColumns: Set<string | number>
	setHiddenColumns: (next: Set<string | number>) => void
	/**
	 * Hidden-column map for the engine's `columnVisibility` state (`{ id: false }`);
	 * pinned and non-data columns are never marked hidden, so they always show.
	 */
	columnVisibility: Record<string, boolean>
	/** Commits a header drag: splices the reordered visible data-column ids back into the full order. */
	reorderColumns: (reorderedIds: (string | number)[]) => void
	managerItems: GridColumnManagerItem[]
}

/**
 * Owns the data table's column slice: the controllable `columnOrder` (bound to
 * the top-level `columnOrder` prop) and `hiddenColumns`, the `columnVisibility`
 * map that feeds the engine, the `reorderColumns` header-drag committer, and the
 * `managerItems` shape consumed by the column-manager dialog. The engine owns
 * the actual resolution (order + visibility + pinning) and produces the rendered
 * visible-column list; this hook only supplies its state. The column-manager's
 * enablement and toolbar-button gates live with the menu actions, not here.
 *
 * @internal
 */
export function useGridColumns<T>({
	columns,
	columnOrderConfig,
	columnManagerConfig,
}: GridColumnsOptions<T>): GridColumnsResult {
	const {
		order: columnOrder,
		setOrder: setColumnOrder,
		hidden: hiddenColumns,
		setHidden: setHiddenColumns,
		byId: columnById,
	} = useGridColumnVisibility({
		columns,
		order: columnOrderConfig?.value,
		defaultOrder: columnOrderConfig?.defaultValue,
		onOrderChange: columnOrderConfig?.onValueChange,
		hidden: columnManagerConfig?.hidden,
		defaultHidden: columnManagerConfig?.defaultHidden,
		onHiddenChange: columnManagerConfig?.onHiddenChange,
	})

	// A header drag only permutes the columns shown with a handle — visible,
	// non-pinned data columns — so the splice predicate matches that exact set
	// and holds every other id (selection/actions/pinned/hidden) in place.
	const reorderColumns = useCallback(
		(reorderedIds: (string | number)[]) => {
			setColumnOrder(
				applyColumnReorder(columnOrder, reorderedIds, (id) => {
					const col = columnById.get(id)

					return !!col && isDataColumn(col) && !col.pinned && !hiddenColumns.has(id)
				}),
			)
		},
		[setColumnOrder, columnOrder, columnById, hiddenColumns],
	)

	const columnVisibility = useMemo(
		() => toColumnVisibility(hiddenColumns, columnById),
		[hiddenColumns, columnById],
	)

	const managerItems = useMemo<GridColumnManagerItem[]>(
		() =>
			columns.filter(isDataColumn).map((c) => ({
				id: c.id,
				title: c.title ?? String(c.id),
				// Either edge reads as pinned; omitted (not `false`) when the column scrolls.
				pinned: c.pinned ? true : undefined,
				hideable: c.hideable,
			})),
		[columns],
	)

	return {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		setHiddenColumns,
		columnVisibility,
		reorderColumns,
		managerItems,
	}
}
