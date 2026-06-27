'use client'

import type { Table } from '@tanstack/react-table'
import { type RefObject, useCallback } from 'react'
import { TableBody } from '../../components/table'
import { useVirtualWindow } from '../../hooks'
import { GridRow, type GridRowClick } from './grid-row'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridVirtualizedBody}. @internal */
type GridVirtualizedBodyProps<T> = {
	scrollRef: RefObject<HTMLDivElement | null>
	/** The engine; rows read their cells from it. */
	table: Table<T>
	rows: T[]
	rowKeys: (string | number)[]
	/** Visible columns, kept for the spacer-row column span. */
	visibleColumns: GridColumn<T>[]
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	rowLabel?: (row: T) => string
	/** Stable per-row click handler; rows are inert when omitted. */
	onRowClick?: GridRowClick<T>
	/** When the rendered body is a window onto a larger set, rows carry global `aria-rowindex`. */
	gridSemantics: boolean
	/** Global row-index base added to each rendered row's index (the page offset under pagination, else 0). */
	rowIndexOffset: number
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	/** Registers each non-pinned data cell against the column sortable for whole-column reorder drags. */
	reorderable: boolean
	/** Truncate overflowing cell content with an ellipsis and an on-hover tooltip. */
	truncate: boolean
	/** Frozen-column controls; pinned cells stick to an edge. `null` when none. */
	pinning: GridColumnPinning | null
	estimateSize: number
	overscan: number
}

/**
 * Windowed body for {@link Grid}: renders only rows in view (plus overscan)
 * via {@link useVirtualWindow}, padding the leading and trailing gap with
 * aria-hidden spacer `<tr>`s so scroll height matches the full row count.
 *
 * @remarks Drives a `@tanstack/react-virtual` measurement lifecycle; assumes
 * uniform `estimateSize` row heights and requires a scroll container of known
 * height (see {@link GridProps.maxHeight}).
 * @internal
 */
export function GridVirtualizedBody<T>({
	scrollRef,
	table,
	rows,
	rowKeys,
	visibleColumns,
	rowLoading,
	rowClassName,
	rowLabel,
	onRowClick,
	gridSemantics,
	rowIndexOffset,
	selection,
	toggleRow,
	reorderable,
	truncate,
	pinning,
	estimateSize,
	overscan,
}: GridVirtualizedBodyProps<T>) {
	// Stable getter for the scroll element; the ref object never changes.
	const getScrollElement = useCallback(() => scrollRef.current, [scrollRef])

	const { virtualItems, topSpacer, bottomSpacer } = useVirtualWindow({
		count: rows.length,
		getScrollElement,
		estimateSize,
		overscan,
	})

	return (
		<TableBody>
			{topSpacer > 0 && (
				// biome-ignore lint/a11y/noAriaHiddenOnFocusable: the spacer is an empty, non-focusable layout filler that must not be exposed as a table row
				<tr data-slot="grid-spacer" aria-hidden="true">
					<td
						colSpan={visibleColumns.length}
						style={{ height: topSpacer, padding: 0, border: 0 }}
					/>
				</tr>
			)}
			{virtualItems.map((vr) => {
				const row = rows[vr.index] as T
				const key = rowKeys[vr.index] as string | number

				return (
					<GridRow<T>
						key={key}
						cells={table.getRow(String(key)).getVisibleCells()}
						row={row}
						rowKey={key}
						loading={rowLoading?.(row) ?? false}
						className={rowClassName?.(row)}
						rowLabel={rowLabel?.(row)}
						onRowClick={onRowClick}
						selected={selection.has(key)}
						toggleRow={toggleRow}
						reorderable={reorderable}
						truncate={truncate}
						pinning={pinning}
						dataRowIndex={vr.index}
						// Header occupies row 1; data rows are offset by 2, plus any page
						// offset (a paginated, virtualized window starts past prior pages).
						rowIndex={gridSemantics ? rowIndexOffset + vr.index + 2 : undefined}
					/>
				)
			})}
			{bottomSpacer > 0 && (
				// biome-ignore lint/a11y/noAriaHiddenOnFocusable: the spacer is an empty, non-focusable layout filler that must not be exposed as a table row
				<tr data-slot="grid-spacer" aria-hidden="true">
					<td
						colSpan={visibleColumns.length}
						style={{ height: bottomSpacer, padding: 0, border: 0 }}
					/>
				</tr>
			)}
		</TableBody>
	)
}
