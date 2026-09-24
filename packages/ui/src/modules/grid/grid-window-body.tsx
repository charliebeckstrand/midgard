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
	/** Whether the body has items but the window has none yet, so it shows the loading skeleton. */
	warming: boolean
	onTransitionEnd?: TransitionEventHandler<HTMLTableSectionElement>
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
 * The `<tbody>` of a windowed grouped or master-detail body. It puts a spacer
 * above and below the rendered rows, as the flat windowed body does. Until
 * the window resolves it holds the loading skeleton, and the bottom spacer
 * stays out. See {@link GridVirtualizedBody} for why.
 *
 * @internal
 */
export function GridWindowBody<T>({
	bodyRef,
	columns,
	pinning,
	topSpacer,
	bottomSpacer,
	warming,
	onTransitionEnd,
	children,
}: GridWindowBodyProps<T>) {
	return (
		<TableBody ref={bodyRef} onTransitionEnd={onTransitionEnd}>
			<GridWindowSpacer height={topSpacer} colSpan={columns.length} />
			{warming ? <GridSkeletonRows columns={columns} pinning={pinning} /> : children}
			{!warming && <GridWindowSpacer height={bottomSpacer} colSpan={columns.length} />}
		</TableBody>
	)
}
