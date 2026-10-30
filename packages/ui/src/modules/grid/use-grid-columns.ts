'use client'

import { useCallback, useMemo } from 'react'
import { isDataColumn } from '../../utilities'
import { EMPTY_SET } from './engine/grid-constants'
import {
	collapsedHiddenIds,
	groupedColumnOrder,
	settleGroupedReorder,
} from './engine/grid-group/compute'
import { isFrozen, normalizeFreeze } from './engine/grid-pin/overrides'
import { applyColumnReorder } from './engine/grid-reorder-compute'
import type { GridColumnManagerConfig, GridColumnOrder } from './grid-data-types'
import type { GridColumnGroup } from './grid-group-types'
import type { GridColumn, GridColumnManagerItem } from './types'
import { useGridColumnVisibility } from './use-grid-column-visibility'

/** Options for {@link useGridColumns}. @internal */
type GridColumnsOptions<T> = {
	columns: GridColumn<T>[]
	columnOrderConfig?: GridColumnOrder
	columnManagerConfig: GridColumnManagerConfig | undefined
	/** Column groups, if any; keep their members contiguous in the effective order. */
	groups?: GridColumnGroup[]
	/** Commits the groups that a header drag writes (see {@link settleGroupedReorder}). */
	setGroups?: (next: GridColumnGroup[]) => void
	/** The ids of the collapsed groups, whose members beyond the anchor hide from the engine. */
	collapsed?: ReadonlySet<string | number>
}

/** Column slice returned by {@link useGridColumns}. @internal */
type GridColumnsResult = {
	columnOrder: (string | number)[]
	setColumnOrder: (next: (string | number)[]) => void
	hiddenColumns: Set<string | number>
	setHiddenColumns: (next: Set<string | number>) => void
	/** The ids that collapsed groups hide, kept apart from the user-hidden set. */
	collapsedHidden: ReadonlySet<string | number>
	/**
	 * Hidden-column map for the engine's `columnVisibility` state (`{ id: false }`);
	 * pinned, non-data, and `hideable: false` columns are never marked hidden, so
	 * they always show.
	 */
	columnVisibility: Record<string, boolean>
	/**
	 * Commits a header drag: splices the reordered visible data-column ids back
	 * into the full order. Under column groups, it writes the drag into the
	 * groups too.
	 */
	reorderColumns: (reorderedIds: (string | number)[]) => void
	managerItems: GridColumnManagerItem[]
}

/**
 * Owns the data table's column slice: the controllable `columnOrder` (bound to
 * the top-level `columnOrder` prop) and `hiddenColumns`. The slice also holds
 * the `columnVisibility` map that feeds the engine, the `reorderColumns`
 * header-drag committer, and the `managerItems` shape consumed by the
 * column-manager dialog. The engine owns
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
	setGroups,
	collapsed,
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
	// manager (and thus the group editor) reorders. The non-data columns (selection,
	// actions, drag handle, expander) and frozen columns hold their slots.
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

	// A header drag only permutes the columns shown with a handle, so the splice
	// predicate is the set that the drag moved. Every other id holds its slot:
	// the selection, actions, pinned, locked, and hidden columns, and the members
	// that a collapsed group hides. The grouped order puts each group back in
	// its block, so under groups the drag goes into the groups first. Otherwise
	// the drop reverts on the next render.
	const reorderColumns = useCallback(
		(reorderedIds: (string | number)[]) => {
			const moved = new Set(reorderedIds)

			if (!groups || groups.length === 0) {
				setColumnOrder(applyColumnReorder(columnOrder, reorderedIds, (id) => moved.has(id)))

				return
			}

			const prev = columnOrder.filter((id) => moved.has(id))

			const settled = settleGroupedReorder(columnOrder, groups, prev, reorderedIds)

			if (settled.groups !== groups) setGroups?.(settled.groups)

			setColumnOrder(groupedColumnOrder(settled.order, settled.groups, isOrderable))
		},
		[setColumnOrder, columnOrder, groups, setGroups, isOrderable],
	)

	// The engine's `columnVisibility` state: only orderable ids are marked hidden,
	// so non-data and frozen columns always show, and an id absent from the map
	// defaults to visible. Collapsed-group members hide here too, kept apart from
	// the manager's user-hidden set so collapsing a group doesn't uncheck them.
	// A collapsed group keeps its first member that shows as the anchor of its
	// band: a member that the reader hid, or that is pinned away from the band,
	// cannot be the anchor.
	const collapsedHidden = useMemo<ReadonlySet<string | number>>(
		() =>
			groups && collapsed
				? collapsedHiddenIds(groups, collapsed, (id) => isOrderable(id) && !hiddenColumns.has(id))
				: EMPTY_SET,
		[groups, collapsed, hiddenColumns, isOrderable],
	)

	// A `hideable: false` column always shows, so the hidden set cannot hide it.
	// The check stays out of `isOrderable`, so the collapse of a group does not change.
	const columnVisibility = useMemo(() => {
		const visibility: Record<string, boolean> = {}

		for (const id of hiddenColumns) {
			if (isOrderable(id) && columnById.get(id)?.hideable !== false) visibility[String(id)] = false
		}

		for (const id of collapsedHidden) visibility[String(id)] = false

		return visibility
	}, [hiddenColumns, collapsedHidden, isOrderable, columnById])

	const managerItems = useMemo<GridColumnManagerItem[]>(
		() =>
			columns.filter(isDataColumn).map((column) => ({
				id: column.id,
				title: column.title ?? String(column.id),
				// The current pin edge (after any runtime override) and the immutable
				// lock edge, each normalized to a side or omitted when absent. The
				// manager places by `locked ?? pinned` and disables the control when locked.
				pinned: normalizeFreeze(column.pinned),
				locked: normalizeFreeze(column.locked),
				hideable: column.hideable,
			})),
		[columns],
	)

	return {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		setHiddenColumns,
		collapsedHidden,
		columnVisibility,
		reorderColumns,
		managerItems,
	}
}
