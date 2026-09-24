'use client'

import { type ReactElement, type RefObject, useCallback, useEffect, useRef } from 'react'
import { TableCell } from '../../components/table'
import { Text } from '../../components/text'
import { useVirtualWindow } from '../../hooks'
import { ariaRowIndex } from './engine/grid-row/shell'
import type { ResolvedInfiniteScroll } from './grid-data-resolvers'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { GridSkeletonCells } from './grid-skeleton-cells'
import { GridWindowBody } from './grid-window-body'
import type { GridColumn } from './types'
import { useGridFitRenderedRows } from './use-grid-fit-rendered-rows'
import { useGridInfiniteScroll } from './use-grid-infinite-scroll'
import type { GridColumnPinning } from './use-grid-table'
import { useGridWindowOffsets } from './use-grid-window-offsets'

/** Scrolls the data row at `rowIndex` (cursor index space) into the rendered window. @internal */
export type GridScrollRowIntoView = (rowIndex: number) => void

/**
 * The single trailing row below the loaded rows for the infinite-scroll terminal
 * states, resolved in precedence order:
 *
 * - a failed load (`error`) shows a `Text tone="error"` message;
 * - an in-flight batch shows the opt-in loading indicator: the custom
 *   `loadingIndicator`, else a per-column skeleton run;
 * - the reached end (`hasMore` false) shows the muted `endMessage`.
 *
 * The skeleton run mirrors the initial loading skeleton. The trailer is `null`
 * for the common mid-scroll case, where none applies. The loading row stays
 * `aria-hidden` filler — the busy status announces the grown total — while the
 * message rows carry real text and stay in the tree.
 *
 * @internal
 */
function GridInfiniteScrollTrailer<T>({
	infiniteScroll,
	columns,
	pinning,
}: {
	infiniteScroll: ResolvedInfiniteScroll
	columns: GridColumn<T>[]
	/** Frozen-column controls, so the pending row's skeleton cells stick like the loaded rows'. `null` when none. */
	pinning: GridColumnPinning | null
}): ReactElement | null {
	const { error, loadingMore, showLoadingIndicator, hasMore, endMessage, loadingIndicator } =
		infiniteScroll

	const colSpan = columns.length

	if (error != null && error !== false) {
		return (
			<tr data-slot="grid-load-error">
				<TableCell colSpan={colSpan}>
					<Text tone="error">{error}</Text>
				</TableCell>
			</tr>
		)
	}

	if (loadingMore && showLoadingIndicator) {
		return (
			// biome-ignore lint/a11y/noAriaHiddenOnFocusable: a non-focusable pending-state filler row that must not be exposed as a data row
			<tr data-slot="grid-loading-more" aria-hidden="true">
				{loadingIndicator ? (
					<td colSpan={colSpan}>{loadingIndicator}</td>
				) : (
					<GridSkeletonCells columns={columns} pinning={pinning} />
				)}
			</tr>
		)
	}

	if (!hasMore && endMessage != null && endMessage !== false) {
		return (
			<tr data-slot="grid-load-end">
				<TableCell colSpan={colSpan}>
					<Text tone="muted">{endMessage}</Text>
				</TableCell>
			</tr>
		)
	}

	return null
}

/** Props for {@link GridVirtualizedBody}. @internal */
type GridVirtualizedBodyProps<T> = GridRowsProps<T> & {
	scrollRef: RefObject<HTMLDivElement | null>
	estimateSize: number
	overscan: number
	/** Published with a scroll-into-view fn while mounted, so the cursor can reach off-window rows. */
	scrollIntoViewRef: RefObject<GridScrollRowIntoView | null>
	/** Infinite-scroll gates driving end-detection and the trailing loading/end/error row, or `null` when off. */
	infiniteScroll: ResolvedInfiniteScroll | null
	/**
	 * Re-fits the columns once this window's rows render, for the fit that had no
	 * rows to measure (see `useGridColumnSizing`). Called from a layout effect, so
	 * the widths land before those rows paint; a no-op once a fit has read rows.
	 */
	fitRenderedRows: () => void
	/** Whether the header sticks to the top edge, so an aligned row must land below it. */
	stickyHeader: boolean
}

/**
 * Windowed body for {@link Grid}: renders only rows in view (plus overscan)
 * via {@link useVirtualWindow}. It pads the leading and trailing gap with
 * aria-hidden spacer `<tr>`s, so scroll height matches the full row count.
 *
 * Until that window resolves it holds the grid's loading skeleton, rather than
 * rendering an empty body. Rows that arrive after mount therefore swap the
 * skeleton straight for data, instead of flashing a rowless table (see
 * {@link GridWindowBody}).
 *
 * @remarks Drives a `@tanstack/react-virtual` measurement lifecycle; assumes
 * uniform `estimateSize` row heights and requires a scroll container of known
 * height (see {@link GridProps.maxHeight}).
 * @internal
 */
export function GridVirtualizedBody<T>(props: GridVirtualizedBodyProps<T>) {
	const { scrollRef, rows, visibleColumns, estimateSize, overscan, pinning } = props

	// Stable getter for the scroll element; the ref object never changes.
	const getScrollElement = useCallback(() => scrollRef.current, [scrollRef])

	const bodyRef = useRef<HTMLTableSectionElement>(null)

	// The header and a top new-row slot sit above the first row, and their sticky
	// part covers the top edge. A bottom slot covers the bottom edge. The window
	// counts each, so `scrollToIndex` lands a row in full view between them.
	const { scrollMargin, scrollPaddingStart, scrollPaddingEnd } = useGridWindowOffsets(
		bodyRef,
		scrollRef,
		props.stickyHeader,
	)

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex } = useVirtualWindow({
		count: rows.length,
		getScrollElement,
		estimateSize,
		overscan,
		scrollMargin,
		scrollPaddingStart,
		scrollPaddingEnd,
	})

	// Fire the infinite-scroll load-more as the last rendered row nears the loaded
	// end (see `useGridInfiniteScroll`); inert when `infiniteScroll` is null. The
	// window renders past the viewport by `overscan`, so the last item's index
	// leads the visible bottom, giving the fetch a head start. The scroll ref
	// supplies the bounded-window evidence (overflow) and the scroll events that
	// arm each post-fill fire.
	const lastItem = virtualItems[virtualItems.length - 1]

	const { infiniteScroll } = props

	useGridInfiniteScroll({
		lastRenderedIndex: lastItem ? lastItem.index : -1,
		count: rows.length,
		infiniteScroll,
		scrollRef,
	})

	// The autosizer fits the columns again once the window's rows render.
	useGridFitRenderedRows(virtualItems.length, props.fitRenderedRows)

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
		<GridWindowBody<T>
			bodyRef={bodyRef}
			columns={visibleColumns}
			pinning={pinning}
			topSpacer={topSpacer}
			bottomSpacer={bottomSpacer}
			itemCount={rows.length}
			windowCount={virtualItems.length}
			// Trailing row below the last rendered rows for the infinite-scroll
			// terminal states. A failed load, an in-flight batch (opt-in), or the
			// reached end, resolved in precedence order (see the trailer).
			trailer={
				infiniteScroll && (
					<GridInfiniteScrollTrailer<T>
						infiniteScroll={infiniteScroll}
						columns={visibleColumns}
						pinning={pinning}
					/>
				)
			}
		>
			{/* Global row indices for the windowed rows; see `ariaRowIndex` for the
			    offset math (a paginated, virtualized window starts past prior pages). */}
			{virtualItems.map((vr) =>
				renderGridRow(
					props,
					rows[vr.index] as T,
					vr.index,
					ariaRowIndex(props.rowIndexOffset, vr.index),
				),
			)}
		</GridWindowBody>
	)
}
