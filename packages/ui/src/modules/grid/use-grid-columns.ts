'use client'

import { useCallback, useMemo } from 'react'
import { isDataColumn } from '../../utilities'
import { EMPTY_SET } from './grid-constants'
import type { GridColumnManagerConfig, GridColumnOrder } from './grid-data-types'
import type { GridColumnGroup } from './grid-group-types'
import { isFrozen, normalizeFreeze } from './grid-pin-overrides'
import { applyColumnReorder } from './grid-reorder'
import type { GridColumn, GridColumnManagerItem } from './types'
import { useGridColumnVisibility } from './use-grid-column-visibility'
import { groupedColumnOrder } from './use-grid-group'

/**
 * The engine's `columnVisibility` state ({ id: false }) for the hidden columns —
 * only hideable ones, so non-data and frozen (pinned or locked) columns are
 * never marked hidden (they always show). Columns absent from the map default to
 * visible.
 *
 * @internal
 */
function toColumnVisibility<T>(
	hiddenColumns: Set<string | number>,
	forcedHidden: Set<string | number>,
	columnById: Map<string | number, GridColumn<T>>,
): Record<string, boolean> {
	const visibility: Record<string, boolean> = {}

	for (const id of hiddenColumns) {
		const col = columnById.get(id)

		if (col && isDataColumn(col) && !isFrozen(col)) visibility[String(id)] = false
	}

	// Collapsed-group members hide from the engine too, kept apart from the
	// manager's user-hidden set so collapsing a group doesn't uncheck its columns.
	for (const id of forcedHidden) {
		const col = columnById.get(id)

		if (col && isDataColumn(col) && !isFrozen(col)) visibility[String(id)] = false
	}

	return visibility
}

/** Options for {@link useGridColumns}. @internal */
type GridColumnsOptions<T> = {
	columns: GridColumn<T>[]
	columnOrderConfig?: GridColumnOrder
	columnManagerConfig: GridColumnManagerConfig | undefined
	/** Column groups, if any; keep their members contiguous in the effective order. */
	groups?: GridColumnGroup[]
	/** Extra ids to hide from the engine beyond the user-hidden set (collapsed-group members). */
	forcedHidden?: Set<string | number>
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
	groups,
	forcedHidden,
}: GridColumnsOptions<T>): GridColumnsResult {
	const {
		order: rawOrder,
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

	// A manager-controlled column: a non-frozen data column, the set the column
	// manager (and thus the group editor) reorders. Selection/actions and frozen
	// columns hold their slots.
	const isOrderable = useCallback(
		(id: string | number) => {
			const col = columnById.get(id)

			return !!col && isDataColumn(col) && !isFrozen(col)
		},
		[columnById],
	)

	// Groups drive the display order so the grid matches the column manager: the
	// effective order leads with the groups' columns (in group order) then the
	// ungrouped ones (idempotent, so it re-derives safely every render). Reorder
	// and the manager both read this grouped order, so their writes stay grouped.
	const columnOrder = useMemo(
		() =>
			groups && groups.length > 0 ? groupedColumnOrder(rawOrder, groups, isOrderable) : rawOrder,
		[rawOrder, groups, isOrderable],
	)

	// A header drag only permutes the columns shown with a handle — visible,
	// non-frozen data columns — so the splice predicate matches that exact set and
	// holds every other id (selection/actions/pinned/locked/hidden) in place.
	const reorderColumns = useCallback(
		(reorderedIds: (string | number)[]) => {
			setColumnOrder(
				applyColumnReorder(columnOrder, reorderedIds, (id) => {
					const col = columnById.get(id)

					return !!col && isDataColumn(col) && !isFrozen(col) && !hiddenColumns.has(id)
				}),
			)
		},
		[setColumnOrder, columnOrder, columnById, hiddenColumns],
	)

	const columnVisibility = useMemo(
		() => toColumnVisibility(hiddenColumns, forcedHidden ?? EMPTY_SET, columnById),
		[hiddenColumns, forcedHidden, columnById],
	)

	const managerItems = useMemo<GridColumnManagerItem[]>(
		() =>
			columns.filter(isDataColumn).map((c) => ({
				id: c.id,
				title: c.title ?? String(c.id),
				// The current pin edge (after any runtime override) and the immutable
				// lock edge, each normalized to a side or omitted when absent. The
				// manager places by `locked ?? pinned` and disables the control when locked.
				pinned: normalizeFreeze(c.pinned),
				locked: normalizeFreeze(c.locked),
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
