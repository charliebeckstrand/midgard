'use client'

import { type ReactNode, useEffect } from 'react'
import { Heading, type HeadingLevel } from '../../components/heading'
import { cn } from '../../core'
import { k as heading } from '../../recipes/kata/heading'
import { k } from '../../recipes/kata/kanban'
import { useKanbanColumnContext } from './context'

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
 * Title heading for a {@link KanbanColumn}, rendered through `<Heading>` at
 * `level` on the title scale, as a `CardTitle` is. It registers with the
 * column while mounted, so the column group names itself through
 * `aria-labelledby`. A long title truncates to one line.
 *
 * @remarks Client component.
 */
export function KanbanColumnTitle({ children, className, level = 3 }: KanbanColumnTitleProps) {
	const { registerTitle, titleId } = useKanbanColumnContext()

	useEffect(() => registerTitle(), [registerTitle])

	return (
		<Heading
			level={level}
			id={titleId}
			data-slot="kanban-column-title"
			className={cn(heading.ramp[4], k.column.title, className)}
		>
			{children}
		</Heading>
	)
}
