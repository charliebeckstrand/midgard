'use client'

import { type ReactNode, useEffect } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { kanbanColumnTitleId, useKanbanColumnContext } from './context'

/** Props for {@link KanbanColumnHeader}: native `<div>` content plus `className`. */
export type KanbanColumnHeaderProps = {
	children?: ReactNode
	className?: string
}

/** Header row of a {@link KanbanColumn}; holds the column title and any per-column controls. */
export function KanbanColumnHeader({ children, className }: KanbanColumnHeaderProps) {
	return (
		<div data-slot="kanban-column-header" className={cn(k.column.header, className)}>
			{children}
		</div>
	)
}

/** Props for {@link KanbanColumnTitle}: title content plus `className`. */
export type KanbanColumnTitleProps = {
	children?: ReactNode
	className?: string
}

/**
 * Title label for a {@link KanbanColumn}. Registers with the column while
 * mounted so the column's `<section>` names itself via `aria-labelledby`.
 *
 * @remarks Client component.
 */
export function KanbanColumnTitle({ children, className }: KanbanColumnTitleProps) {
	const { columnId, registerTitle } = useKanbanColumnContext()

	useEffect(() => registerTitle(), [registerTitle])

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
