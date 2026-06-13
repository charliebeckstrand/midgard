import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'

/** Props for {@link KanbanColumnBody}: the card list, plus an `empty` placeholder shown when there are none. */
export type KanbanColumnBodyProps = {
	/** Shown when the column has no cards. */
	empty?: ReactNode
	children?: ReactNode
	className?: string
}

/** Scrollable card region of a {@link KanbanColumn}; renders its cards, or the `empty` placeholder when there are none. */
export function KanbanColumnBody({ empty, children, className }: KanbanColumnBodyProps) {
	const hasChildren = Array.isArray(children) ? children.length > 0 : children != null

	return (
		<div data-slot="kanban-column-body" className={cn(k.column.body, className)}>
			{hasChildren ? children : empty ? <div className={cn(k.column.empty)}>{empty}</div> : null}
		</div>
	)
}
