'use client'

import type { ReactNode, RefObject, TransitionEventHandler } from 'react'
import { TableBody } from '../../components/table'
import { GridSkeletonRows } from './grid-skeleton-cells'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

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
	/** The count of items that the window renders. */
	windowCount: number
	onTransitionEnd?: TransitionEventHandler<HTMLTableSectionElement>
	/** A row after the bottom spacer, such as the infinite-scroll trailer. */
	trailer?: ReactNode
	/** The rendered rows of the window. */
	children: ReactNode
}

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
 * the rendered rows, and an optional trailer row after them.
 *
 * @remarks The body can hold items while its window holds none. The window is
 * empty until the virtualizer has resolved and measured its scroll element. That
 * happens a commit or two after the rows arrive, because the virtualizer
 * re-attaches only once the refs are in place (see `useVirtualWindow`). The
 * window also stays empty while the element measures zero, such as in a
 * `display: none` panel or a server render. The body then holds the loading
 * skeleton, not an empty body. The grid's own skeleton leaves in those frames,
 * because `loading` goes false with the rows. The skeleton therefore keeps the
 * swap to rows in one commit, with the fit that sizes their columns. The
 * skeleton also gives the scroller its height, so the bottom spacer stays out
 * until rows render.
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
	windowCount,
	onTransitionEnd,
	trailer,
	children,
}: GridWindowBodyProps<T>) {
	const warming = itemCount > 0 && windowCount === 0

	return (
		<TableBody ref={bodyRef} onTransitionEnd={onTransitionEnd}>
			<GridWindowSpacer height={topSpacer} colSpan={columns.length} />
			{warming ? <GridSkeletonRows columns={columns} pinning={pinning} /> : children}
			{!warming && <GridWindowSpacer height={bottomSpacer} colSpan={columns.length} />}
			{trailer}
		</TableBody>
	)
}
