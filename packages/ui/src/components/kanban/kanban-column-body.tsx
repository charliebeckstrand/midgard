import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type KanbanColumnBodyProps = {
	/** Shown when the column has no cards. */
	empty?: ReactNode
	children?: ReactNode
	className?: string
}

export function KanbanColumnBody({ empty, children, className }: KanbanColumnBodyProps) {
	const hasChildren = Array.isArray(children) ? children.length > 0 : children != null

	return (
		<div data-slot="kanban-column-body" className={cn(k.columnBody, className)}>
			{hasChildren ? children : empty ? <div className={cn(k.columnEmpty)}>{empty}</div> : null}
		</div>
	)
}
