'use client'

import { type RefObject, useCallback } from 'react'
import { useVirtualWindow } from '../../hooks'
import { TableBody } from '../table'
import { DataTableRow } from './data-table-row'
import type { DataTableColumn } from './types'

/** Props for {@link DataTableVirtualizedBody}. @internal */
type DataTableVirtualizedBodyProps<T> = {
	scrollRef: RefObject<HTMLDivElement | null>
	rows: T[]
	rowKeys: (string | number)[]
	visibleColumns: DataTableColumn<T>[]
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	rowLabel?: (row: T) => string
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	estimateSize: number
	overscan: number
}

/**
 * Windowed body for {@link DataTable}: renders only rows in view (plus overscan)
 * via {@link useVirtualWindow}, padding the leading and trailing gap with
 * aria-hidden spacer `<tr>`s so scroll height matches the full row count.
 *
 * @remarks Drives a `@tanstack/react-virtual` measurement lifecycle; assumes
 * uniform `estimateSize` row heights and requires a scroll container of known
 * height (see {@link DataTableProps.maxHeight}).
 * @internal
 */
export function DataTableVirtualizedBody<T>({
	scrollRef,
	rows,
	rowKeys,
	visibleColumns,
	rowLoading,
	rowClassName,
	rowLabel,
	selection,
	toggleRow,
	estimateSize,
	overscan,
}: DataTableVirtualizedBodyProps<T>) {
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
				<tr data-slot="data-table-spacer" aria-hidden="true">
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
					<DataTableRow<T>
						key={key}
						row={row}
						rowKey={key}
						columns={visibleColumns}
						loading={rowLoading?.(row) ?? false}
						className={rowClassName?.(row)}
						rowLabel={rowLabel?.(row)}
						selected={selection.has(key)}
						toggleRow={toggleRow}
						dataRowIndex={vr.index}
						// Header occupies row 1; data rows are offset by 2.
						rowIndex={vr.index + 2}
					/>
				)
			})}
			{bottomSpacer > 0 && (
				// biome-ignore lint/a11y/noAriaHiddenOnFocusable: the spacer is an empty, non-focusable layout filler that must not be exposed as a table row
				<tr data-slot="data-table-spacer" aria-hidden="true">
					<td
						colSpan={visibleColumns.length}
						style={{ height: bottomSpacer, padding: 0, border: 0 }}
					/>
				</tr>
			)}
		</TableBody>
	)
}
