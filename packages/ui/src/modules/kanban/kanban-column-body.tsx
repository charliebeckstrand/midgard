'use client'

import { Children, type HTMLAttributes, isValidElement, type ReactNode } from 'react'
import { ariaAttr, cn } from '../../core'
import { useScrollRegion } from '../../hooks'
import { k } from '../../recipes/kata/kanban'
import { KanbanCardSkeleton } from './kanban-card-skeleton'

/**
 * Props for {@link KanbanColumnBody}: the card list, plus an `empty` placeholder shown when there are none.
 * The body takes the rest: a `<ul>` with cards, or else a `<div>`.
 */
export type KanbanColumnBodyProps = HTMLAttributes<HTMLElement> & {
	/** Shown when the column has no cards. */
	empty?: ReactNode
}

/**
 * Scrollable card region of a {@link KanbanColumn}; renders its cards, or the `empty` placeholder when there are none.
 *
 * @remarks With cards, the body is a `<ul>`, and each card is in an `<li>`, so
 * AT gives the count of the cards and the position of each. On an interactive
 * board, the dnd-kit node of each card is a `<div>` inside its `<li>`. The `empty` placeholder is not a list item, so the body is a `<div>`
 * while it shows it. A {@link KanbanCardSkeleton} is an `aria-hidden` item, so
 * a body that holds only skeletons hides the list as a whole: AT then finds no
 * list with no items. While the cards overflow the body, the body is a tab stop.
 */
export function KanbanColumnBody({ empty, children, className, ...props }: KanbanColumnBodyProps) {
	// Count what React renders, not the slots. A `false` card slot renders
	// nothing, so it must not hide the placeholder or keep the list. The
	// body still renders `children` as-is, so no key shifts.
	const items = Children.toArray(children)

	const hasChildren = items.length > 0

	// A skeleton is not a card. A list of skeletons only has no item for AT.
	const loading = items.every((item) => isValidElement(item) && item.type === KanbanCardSkeleton)

	const scrollRegionRef = useScrollRegion()

	if (hasChildren) {
		return (
			<ul
				// A hidden body has nothing to read, so it is not a tab stop.
				ref={loading ? undefined : scrollRegionRef}
				data-slot="kanban-column-body"
				aria-hidden={ariaAttr(loading)}
				{...props}
				className={cn(k().column.body, className)}
			>
				{children}
			</ul>
		)
	}

	return (
		<div
			ref={scrollRegionRef}
			data-slot="kanban-column-body"
			{...props}
			className={cn(k().column.body, className)}
		>
			{empty ? <div className={k().column.empty}>{empty}</div> : null}
		</div>
	)
}
