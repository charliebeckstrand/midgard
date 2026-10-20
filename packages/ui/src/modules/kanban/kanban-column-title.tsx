'use client'

import { useEffect } from 'react'
import { CardTitle, type CardTitleProps } from '../../components/card'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { useKanbanColumnContext } from './context'

/**
 * Props for {@link KanbanColumnTitle}: the props of a `CardTitle`, without `id`
 * and `size`. The column names its group through the id of the title, so the
 * title sets it. The title takes the step of the nearest density scope.
 */
export type KanbanColumnTitleProps = Omit<CardTitleProps, 'id' | 'size'>

/**
 * Title heading for a {@link KanbanColumn}: a `CardTitle`, at `level` 3 by
 * default. It registers with the column while mounted, so the column group
 * names itself through `aria-labelledby`. A long title truncates to one line.
 *
 * @remarks Client component.
 */
export function KanbanColumnTitle({ className, ...props }: KanbanColumnTitleProps) {
	const { registerTitle, titleId } = useKanbanColumnContext()

	useEffect(() => registerTitle(), [registerTitle])

	return (
		<CardTitle
			data-slot="kanban-column-title"
			{...props}
			// The column group refers to this id, so it comes after the spread.
			id={titleId}
			className={cn(k.column.title, className)}
		/>
	)
}
