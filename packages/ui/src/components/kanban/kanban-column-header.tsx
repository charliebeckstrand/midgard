'use client'

import { type ReactNode, useEffect } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import type { HeadingLevel } from '../heading'
import { useKanbanColumnContext } from './context'

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

/** Props for {@link KanbanColumnTitle}: title content, the heading `level`, and `className`. */
export type KanbanColumnTitleProps = {
	children?: ReactNode
	className?: string
	/**
	 * Heading level of the rendered title. Set it to fit the outline of the page.
	 * @defaultValue 3
	 */
	level?: HeadingLevel
}

/**
 * Title heading for a {@link KanbanColumn}, rendered as `h{level}`. It registers
 * with the column while mounted, so the column group names itself through
 * `aria-labelledby`. The title keeps the size and the weight of the header row.
 *
 * @remarks Client component.
 */
export function KanbanColumnTitle({ children, className, level = 3 }: KanbanColumnTitleProps) {
	const { registerTitle, titleId } = useKanbanColumnContext()

	useEffect(() => registerTitle(), [registerTitle])

	// Tailwind preflight resets the font of a heading, so the title takes the
	// font of the header row.
	const Heading = `h${level}` as const

	return (
		<Heading id={titleId} data-slot="kanban-column-title" className={cn(k.column.title, className)}>
			{children}
		</Heading>
	)
}
