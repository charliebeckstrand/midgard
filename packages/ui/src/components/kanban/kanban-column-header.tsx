import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type KanbanColumnHeaderProps = {
	children?: ReactNode
	className?: string
}

export function KanbanColumnHeader({ children, className }: KanbanColumnHeaderProps) {
	return (
		<div data-slot="kanban-column-header" className={cn(k.columnHeader, className)}>
			{children}
		</div>
	)
}

export type KanbanColumnTitleProps = {
	children?: ReactNode
	className?: string
}

export function KanbanColumnTitle({ children, className }: KanbanColumnTitleProps) {
	return (
		<span data-slot="kanban-column-title" className={cn(k.columnTitle, className)}>
			{children}
		</span>
	)
}
