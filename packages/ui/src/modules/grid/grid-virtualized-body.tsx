'use client'

import { type RefObject, useCallback, useEffect } from 'react'
import { TableBody } from '../../components/table'
import { useVirtualWindow } from '../../hooks'
import { type GridRowsProps, renderGridRow } from './grid-row'

/** Scrolls the data row at `rowIndex` (cursor index space) into the rendered window. @internal */
export type GridScrollRowIntoView = (rowIndex: number) => void

/** Props for {@link GridVirtualizedBody}. @internal */
type GridVirtualizedBodyProps<T> = GridRowsProps<T> & {
	scrollRef: RefObject<HTMLDivElement | null>
	estimateSize: number
	overscan: number
	/** Published with a scroll-into-view fn while mounted, so the cursor can reach off-window rows. */
	scrollIntoViewRef: RefObject<GridScrollRowIntoView | null>
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
export function GridVirtualizedBody<T>(props: GridVirtualizedBodyProps<T>) {
	const { scrollRef, rows, visibleColumns, estimateSize, overscan } = props

	// Stable getter for the scroll element; the ref object never changes.
	const getScrollElement = useCallback(() => scrollRef.current, [scrollRef])

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex } = useVirtualWindow({
		count: rows.length,
		getScrollElement,
		estimateSize,
		overscan,
	})

	// Publish a row-scroller to the cursor while this windowed body is mounted, so a
	// keyboard jump can scroll an off-window row into the window before the cursor
	// points `aria-activedescendant` at it; cleared when the body unmounts.
	const { scrollIntoViewRef } = props

	useEffect(() => {
		scrollIntoViewRef.current = (rowIndex) => scrollToIndex(rowIndex, { align: 'auto' })

		return () => {
			scrollIntoViewRef.current = null
		}
	}, [scrollToIndex, scrollIntoViewRef])

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
			{/* Header occupies row 1; data rows are offset by 2, plus any page offset
			    (a paginated, virtualized window starts past prior pages). */}
			{virtualItems.map((vr) =>
				renderGridRow(props, rows[vr.index] as T, vr.index, props.rowIndexOffset + vr.index + 2),
			)}
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
