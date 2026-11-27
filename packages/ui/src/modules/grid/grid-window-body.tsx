'use client'

import type { VirtualItem } from '@tanstack/virtual-core'
import type { FocusEventHandler, ReactNode, RefObject, TransitionEventHandler } from 'react'
import { TableBody } from '../../components/table'
import type { GridColumnPinning } from './engine/grid-table/pinning-view'
import { GridSkeletonRows } from './grid-skeleton-cells'
import type { GridColumn } from './types'

/** Props for {@link GridWindowBody}. @internal */
type GridWindowBodyProps<T> = {
	bodyRef: RefObject<HTMLTableSectionElement | null>
	columns: GridColumn<T>[]
	pinning: GridColumnPinning | null
	/** The height of the rows above the window, in pixels. */
	topSpacer: number
	/** The height of the rows below the window, in pixels. */
	bottomSpacer: number
	/** The count of items in the whole list. */
	itemCount: number
	/** The items that the window renders, in index order, with each kept item. */
	virtualItems: readonly VirtualItem[]
	/** The height of the rows that are not rendered before each item (see `useVirtualWindow`). */
	gaps: readonly number[]
	/** Renders the keyed row of one item. */
	renderItem: (virtualItem: VirtualItem) => ReactNode
	/**
	 * Called when the reveal of a row ends. That is a `transitionend` or a
	 * `transitioncancel`. A cancel lands the reveal when an ancestor's
	 * `display: none` interrupts its collapse, and not when a toggle reverses it
	 * (`transitionLanded`).
	 */
	onRevealLand?: TransitionEventHandler<HTMLTableSectionElement>
	onFocus?: FocusEventHandler<HTMLTableSectionElement>
	onBlur?: FocusEventHandler<HTMLTableSectionElement>
	/** A row after the bottom spacer, such as the infinite-scroll trailer. */
	trailer?: ReactNode
}

/**
 * The prefix of the React key of a gap spacer. It keeps the key of a spacer
 * apart from the keys of the rows in the same list. @internal
 */
const GAP_KEY = 'grid-window-gap:'

/**
 * One `aria-hidden` spacer row, which stands in for the rows outside the
 * window. A zero height renders nothing.
 *
 * @internal
 */
function GridWindowSpacer({ height, colSpan }: { height: number; colSpan: number }) {
	if (height <= 0) return null

	return (
		// biome-ignore lint/a11y/noAriaHiddenOnFocusable: the spacer is an empty, non-focusable layout filler that must not be exposed as a table row
		<tr data-slot="grid-spacer" aria-hidden="true">
			<td colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
		</tr>
	)
}

/**
 * The `<tbody>` of each windowed grid body. It puts a spacer above and below
 * the rendered rows, and an optional trailer row after them. A row that the
 * window keeps out of view renders at its true position. A gap spacer before
 * it, or before the window, stands in for the rows between them. The rows and
 * the spacers are one keyed list, so a kept row keeps its node when the window
 * comes back to it.
 *
 * @remarks Until the scroll element measures, the window assumes
 * `FIRST_WINDOW_RECT` for it. A server render and the first client render thus
 * paint the same first rows, and the browser sizes the columns from them (see
 * `createColumnSizer`). The body can still hold items while its window holds none:
 * the window is empty while the element measures zero, such as in a
 * `display: none` panel. The body then holds the loading skeleton, not an empty
 * body. The skeleton also gives the scroller its height, so the bottom spacer
 * stays out until rows render.
 *
 * @internal
 */
export function GridWindowBody<T>({
	bodyRef,
	columns,
	pinning,
	topSpacer,
	bottomSpacer,
	itemCount,
	virtualItems,
	gaps,
	renderItem,
	onRevealLand,
	onFocus,
	onBlur,
	trailer,
}: GridWindowBodyProps<T>) {
	const warming = itemCount > 0 && virtualItems.length === 0

	const rows = virtualItems.flatMap((virtualItem, at) => {
		const row = renderItem(virtualItem)

		const gap = gaps[at] ?? 0

		if (gap <= 0) return [row]

		return [
			<GridWindowSpacer
				key={`${GAP_KEY}${virtualItem.key}`}
				height={gap}
				colSpan={columns.length}
			/>,
			row,
		]
	})

	return (
		<TableBody
			ref={bodyRef}
			onTransitionEnd={onRevealLand}
			onTransitionCancel={onRevealLand}
			onFocus={onFocus}
			onBlur={onBlur}
		>
			<GridWindowSpacer height={topSpacer} colSpan={columns.length} />
			{warming ? <GridSkeletonRows columns={columns} pinning={pinning} /> : rows}
			{!warming && <GridWindowSpacer height={bottomSpacer} colSpan={columns.length} />}
			{trailer}
		</TableBody>
	)
}
