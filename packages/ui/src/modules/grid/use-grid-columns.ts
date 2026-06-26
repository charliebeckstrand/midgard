'use client'

import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { isDataColumn } from '../../utilities'
import type { GridColumnManagerConfig, GridColumnOrder } from './grid'
import { applyColumnReorder } from './grid-reorder'
import type { GridColumn, GridColumnManagerItem } from './types'
import { useGridColumnVisibility } from './use-grid-column-visibility'

/** Element-wise reference equality between two arrays. @internal */
function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

/**
 * True unless `col` is a hideable data column the user has hidden; non-data and
 * pinned columns always show.
 *
 * @internal
 */
function isColumnVisible<T>(col: GridColumn<T>, hiddenColumns: Set<string | number>): boolean {
	if (!isDataColumn(col) || col.pinned) return true

	return !hiddenColumns.has(col.id)
}

/**
 * Stable-partitions columns to their pinned edge: left-pinned (`true`/`'left'`)
 * first, unpinned in the middle, right-pinned last, each group keeping its
 * relative order. Pulling frozen columns to the edges lets the header, engine
 * cells, and `<colgroup>` share one order while the sticky offsets stack from
 * the edge inward.
 *
 * @internal
 */
function partitionByPin<T>(columns: GridColumn<T>[]): GridColumn<T>[] {
	const left: GridColumn<T>[] = []
	const center: GridColumn<T>[] = []
	const right: GridColumn<T>[] = []

	for (const col of columns) {
		if (col.pinned === 'right') right.push(col)
		else if (col.pinned) left.push(col)
		else center.push(col)
	}

	// Skip the concat allocation when nothing is pinned (the common case).
	if (left.length === 0 && right.length === 0) return columns

	return [...left, ...center, ...right]
}

/**
 * Orders columns by the stored order, then appends any not represented (e.g.
 * added after mount), dropping hidden columns from both passes, and finally
 * pulls pinned columns to their edges.
 *
 * @internal
 */
function buildVisibleColumns<T>(
	columns: GridColumn<T>[],
	columnOrder: (string | number)[],
	columnById: Map<string | number, GridColumn<T>>,
	hiddenColumns: Set<string | number>,
): GridColumn<T>[] {
	const ordered: GridColumn<T>[] = []

	const seen = new Set<string | number>()

	for (const id of columnOrder) {
		const col = columnById.get(id)

		if (!col) continue

		seen.add(col.id)

		if (isColumnVisible(col, hiddenColumns)) ordered.push(col)
	}

	// Append any column not represented in the stored order (e.g. added after mount).
	for (const col of columns) {
		if (seen.has(col.id)) continue

		if (isColumnVisible(col, hiddenColumns)) ordered.push(col)
	}

	return partitionByPin(ordered)
}

/** Options for {@link useGridColumns}. @internal */
type GridColumnsOptions<T> = {
	columns: GridColumn<T>[]
	columnOrderConfig?: GridColumnOrder
	columnManagerConfig: GridColumnManagerConfig | undefined
}

/** Column slice returned by {@link useGridColumns}. @internal */
type GridColumnsResult<T> = {
	columnOrder: (string | number)[]
	setColumnOrder: (next: (string | number)[]) => void
	hiddenColumns: Set<string | number>
	setHiddenColumns: (next: Set<string | number>) => void
	visibleColumns: GridColumn<T>[]
	/** Commits a header drag: splices the reordered visible data-column ids back into the full order. */
	reorderColumns: (reorderedIds: (string | number)[]) => void
	managerItems: GridColumnManagerItem[]
	manageColumns: boolean
	manageColumnsLabel: ReactNode
}

/**
 * Owns the data table's column slice: the controllable `columnOrder` (bound to
 * the top-level `columnOrder` prop) and `hiddenColumns`, the derived
 * `columnById` map, the ordered + filtered `visibleColumns` list, the
 * `reorderColumns` header-drag committer, and the `managerItems` shape consumed
 * by the column-manager dialog. `manageColumns` / `manageColumnsLabel` collapse
 * the config's enabled flag and label into plain values for the dialog's render
 * gate.
 *
 * @returns A {@link GridColumnsResult}: the controllable `columnOrder` /
 * `setColumnOrder` and `hiddenColumns` / `setHiddenColumns`, the ordered +
 * filtered `visibleColumns`, the `reorderColumns` committer for header drags,
 * the `managerItems` for the dialog, and the `manageColumns` /
 * `manageColumnsLabel` render-gate values.
 * @internal
 */
export function useGridColumns<T>({
	columns,
	columnOrderConfig,
	columnManagerConfig,
}: GridColumnsOptions<T>): GridColumnsResult<T> {
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

	const manageColumns = columnManagerConfig?.enabled ?? false

	const manageColumnsLabel = columnManagerConfig?.label ?? 'Columns'

	const visibleColumnsCandidate = useMemo(
		() => buildVisibleColumns(columns, columnOrder, columnById, hiddenColumns),
		[columns, columnById, columnOrder, hiddenColumns],
	)

	// Reuse the previous array reference when contents are element-wise identical.
	const visibleColumnsRef = useRef(visibleColumnsCandidate)

	const visibleColumns = sameElements(visibleColumnsRef.current, visibleColumnsCandidate)
		? visibleColumnsRef.current
		: visibleColumnsCandidate

	visibleColumnsRef.current = visibleColumns

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
		visibleColumns,
		reorderColumns,
		managerItems,
		manageColumns,
		manageColumnsLabel,
	}
}
