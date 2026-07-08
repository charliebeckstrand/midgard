'use client'

import { type ReactElement, type RefObject, useCallback, useEffect } from 'react'
import { TableBody, TableCell } from '../../components/table'
import { Text, TextSkeleton } from '../../components/text'
import { useVirtualWindow } from '../../hooks'
import type { ResolvedInfiniteScroll } from './grid-data-resolvers'
import { type GridRowsProps, renderGridRow } from './grid-row'
import type { GridColumn } from './types'
import { useGridInfiniteScroll } from './use-grid-infinite-scroll'

/** Scrolls the data row at `rowIndex` (cursor index space) into the rendered window. @internal */
export type GridScrollRowIntoView = (rowIndex: number) => void

/**
 * The single trailing row below the loaded rows for the infinite-scroll terminal
 * states, resolved in precedence order: a failed load (`error`) shows a
 * `Text severity="error"` message; an in-flight batch shows the opt-in loading
 * indicator (the custom `loadingIndicator`, else a per-column skeleton run
 * mirroring the initial loading skeleton); the reached end (`hasMore` false)
 * shows the muted `endMessage`. `null` for the common mid-scroll case, where none
 * applies. The loading row stays `aria-hidden` filler — the busy status announces
 * the grown total — while the message rows carry real text and stay in the tree.
 *
 * @internal
 */
function GridInfiniteScrollTrailer<T>({
	infiniteScroll,
	columns,
}: {
	infiniteScroll: ResolvedInfiniteScroll
	columns: GridColumn<T>[]
}): ReactElement | null {
	const { error, loadingMore, showLoadingIndicator, hasMore, endMessage, loadingIndicator } =
		infiniteScroll

	const colSpan = columns.length

	if (error != null && error !== false) {
		return (
			<tr data-slot="grid-load-error">
				<TableCell colSpan={colSpan}>
					<Text severity="error">{error}</Text>
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
					columns.map((col) => (
						<TableCell key={col.id}>
							<TextSkeleton />
						</TableCell>
					))
				)}
			</tr>
		)
	}

	if (!hasMore && endMessage != null && endMessage !== false) {
		return (
			<tr data-slot="grid-load-end">
				<TableCell colSpan={colSpan}>
					<Text severity="muted">{endMessage}</Text>
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
			{/* Trailing row below the last rendered rows for the infinite-scroll
			    terminal states — a failed load, an in-flight batch (opt-in), or the
			    reached end — resolved in precedence order (see the trailer). */}
			{infiniteScroll && (
				<GridInfiniteScrollTrailer<T> infiniteScroll={infiniteScroll} columns={visibleColumns} />
			)}
		</TableBody>
	)
}
