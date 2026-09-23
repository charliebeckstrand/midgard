'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { useKanbanContext } from './context'

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
 * @remarks On a read-only or disabled board the body is a `role="list"` of its
 * `role="listitem"` cards. An interactive board keeps no list role, because
 * dnd-kit makes each card a `button`, and a list owns only list items. The
 * `empty` placeholder is not a list item, so the body drops the role while it
 * shows it.
 */
export function KanbanColumnBody({ empty, children, className }: KanbanColumnBodyProps) {
	const { interactive } = useKanbanContext()

	const hasChildren = Array.isArray(children) ? children.length > 0 : children != null

	return (
		<div
			data-slot="kanban-column-body"
			role={!interactive && hasChildren ? 'list' : undefined}
			className={cn(k.column.body, className)}
		>
			{hasChildren ? children : empty ? <div className={cn(k.column.empty)}>{empty}</div> : null}
		</div>
	)
}
