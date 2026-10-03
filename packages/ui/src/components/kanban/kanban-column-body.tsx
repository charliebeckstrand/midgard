'use client'

import { Children, type ReactNode } from 'react'
import { cn } from '../../core'
import { useScrollRegion } from '../../hooks'
import { k } from '../../recipes/kata/kanban'

/** Props for {@link KanbanColumnBody}: the card list, plus an `empty` placeholder shown when there are none. */
export type KanbanColumnBodyProps = {
	/** Shown when the column has no cards. */
	empty?: ReactNode
	children?: ReactNode
	className?: string
}

/**
 * Scrollable card region of a {@link KanbanColumn}; renders its cards, or the `empty` placeholder when there are none.
 *
 * @remarks With cards, the body is a `<ul>`, and each card is in an `<li>`, so
 * AT gives the count of the cards and the position of each. On an interactive
 * board, the dnd-kit node of each card is a `<div>` inside its `<li>`. The `empty` placeholder is not a list item, so the body is a `<div>`
 * while it shows it. While the cards overflow the body, the body is a tab stop.
 */
export function KanbanColumnBody({ empty, children, className }: KanbanColumnBodyProps) {
	// Count what React renders, not the slots. A `false` card slot renders
	// nothing, so it must not hide the placeholder or keep the list. The
	// body still renders `children` as-is, so no key shifts.
	const hasChildren = Children.toArray(children).length > 0

	const scrollRegionRef = useScrollRegion()

	if (hasChildren) {
		return (
			<ul
				ref={scrollRegionRef}
				data-slot="kanban-column-body"
				className={cn(k.column.body, className)}
			>
				{children}
			</ul>
		)
	}

	return (
		<div
			ref={scrollRegionRef}
			data-slot="kanban-column-body"
			className={cn(k.column.body, className)}
		>
			{empty ? <div className={cn(k.column.empty)}>{empty}</div> : null}
		</div>
	)
}
