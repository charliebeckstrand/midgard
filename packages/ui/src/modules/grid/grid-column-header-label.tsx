'use client'

import { ArrowDown, ArrowUp, Pin } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid'
import { useGridResizing } from './context'
import { columnLabel } from './engine/grid-column/label'
import type { GridColumn } from './types'
import { useGridTruncation } from './use-grid-truncation'

/** Up/down arrow for the active sort column, or `null` when unsorted. @internal */
function sortDirectionIcon(
	sorted: boolean,
	direction: 'asc' | 'desc' | undefined,
): ReactElement | null {
	if (!sorted) return null

	// `shrink-0` keeps the arrow at full size while the adjacent title truncates.
	const className = cn(k.sort.icon({ active: true }), 'shrink-0')

	if (direction === 'asc') return <Icon icon={<ArrowUp />} className={className} />

	if (direction === 'desc') return <Icon icon={<ArrowDown />} className={className} />

	return null
}

/**
 * A column's title on a single line, truncated to an ellipsis when it overflows
 * the header. A truncated title gains a hover/focus {@link Tooltip} revealing the
 * full text. It shares the data cell's sub-pixel overflow detection, so the
 * header and its column clip in step. An untruncated title renders just the span;
 * the closed tooltip adds no surface.
 *
 * @remarks Unlike {@link GridCellContent}, the header always mounts the tooltip
 * and gates it through `disabled`. The overflow `ResizeObserver` therefore never
 * detaches, and a widened column re-measures and closes the tooltip.
 * @internal
 */
function GridHeaderTitle({ title }: { title: ReactNode }): ReactElement {
	// No settle key: the header cell re-renders on its own engine `width` prop
	// (drag and nudge alike), so the commit measure already re-runs at settle —
	// unlike the memoized body cells, which take the snapshot from the grid.
	const resizing = useGridResizing()

	// A drag renders the header on each frame. The body cells stand their
	// measure down through the drag, and so does the title; the render at the
	// settle measures it again.
	const [ref, truncated] = useGridTruncation<HTMLSpanElement>(undefined, resizing)

	return (
		// `!resizing` holds the tooltip closed through a column drag-resize: the
		// drag reflows the header, and the overflow tooltip would otherwise flash
		// open over the content the resize is reshaping.
		<Tooltip disabled={!truncated || resizing}>
			<TooltipTrigger>
				{/* `data-grid-content` marks the title leaf so the autosizer reads its
				    intrinsic width and decides the column's header-driven minimum. */}
				<span ref={ref} data-grid-content className={cn(k.head.title)}>
					{title}
				</span>
			</TooltipTrigger>

			<TooltipContent className={cn(k.cell.tooltip)}>{title}</TooltipContent>
		</Tooltip>
	)
}

/** Title text, wrapped in a sort-toggle button when the column is sortable and interactive. @internal */
export function GridColumnHeaderLabel({
	column,
	sorted,
	direction,
	sortPriority,
	toggleSort,
	interactive,
}: {
	column: Pick<GridColumn<unknown>, 'id' | 'title' | 'sortable'>
	sorted: boolean
	direction: 'asc' | 'desc' | undefined
	sortPriority: number | undefined
	toggleSort: (column: string | number, additive: boolean) => void
	interactive: boolean
}): ReactNode {
	if (!column.sortable || !interactive) return <GridHeaderTitle title={column.title} />

	return (
		<HeadlessProvider>
			<Button
				type="button"
				className={cn(k.sort.button)}
				// A Shift-click folds this column into the existing sort (multi-column);
				// a plain click collapses the sort to just this column.
				onClick={(event) => toggleSort(column.id, event.shiftKey)}
				// The explicit name overrides the inner badge, so fold the multi-column
				// sort priority into it; otherwise the digit is never announced (WCAG 1.3.1).
				aria-label={
					sortPriority != null
						? `Sort by ${columnLabel(column)}, sort priority ${sortPriority}`
						: `Sort by ${columnLabel(column)}`
				}
			>
				<GridHeaderTitle title={column.title} />
				{sortDirectionIcon(sorted, direction)}
				{sortPriority != null && (
					<span aria-hidden className={cn(k.sort.badge)}>
						{sortPriority}
					</span>
				)}
			</Button>
		</HeadlessProvider>
	)
}

/**
 * Pinned column header: an unpin button leading its title. A locked column shows
 * no indicator here, because its frozen edge is marked by the boundary border. A
 * scrolling column renders its title alone. Both bypass this.
 *
 * @internal
 */
export function GridPinnedHeaderLabel({
	column,
	pinColumn,
	label,
}: {
	column: Pick<GridColumn<unknown>, 'id' | 'title'>
	pinColumn: (column: string | number, side: 'left' | 'right' | false) => void
	label: ReactNode
}) {
	return (
		<span className={cn(k.head.pinned.label)}>
			<button
				type="button"
				className={cn(k.head.pinned.button)}
				aria-label={`Unpin ${columnLabel(column)}`}
				onClick={() => pinColumn(column.id, false)}
			>
				<Icon icon={<Pin />} />
			</button>
			{label}
		</span>
	)
}
