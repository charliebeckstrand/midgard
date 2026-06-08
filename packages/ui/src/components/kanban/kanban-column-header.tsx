import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { kanbanColumnTitleId, useKanbanColumnContext } from './context'

export type KanbanColumnHeaderProps = {
	children?: ReactNode
	className?: string
}

export function KanbanColumnHeader({ children, className }: KanbanColumnHeaderProps) {
	return (
		<div data-slot="kanban-column-header" className={cn(k.column.header, className)}>
			{children}
		</div>
	)
}

export type KanbanColumnTitleProps = {
	children?: ReactNode
	className?: string
}

export function KanbanColumnTitle({ children, className }: KanbanColumnTitleProps) {
	const { columnId } = useKanbanColumnContext()

	return (
		<span
			id={kanbanColumnTitleId(columnId)}
			data-slot="kanban-column-title"
			className={cn(k.column.title, className)}
		>
			{children}
		</span>
	)
}
