'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { KanbanColumnContext, kanbanColumnTitleId, useKanbanContext } from './context'

export type KanbanColumnProps = {
	/** Stable id matching an entry in the `columns` prop. */
	columnId: string
	children?: ReactNode
	className?: string
	/** Explicit name for the column section. Defaults to the rendered `KanbanColumnTitle`. */
	'aria-label'?: string
}

export function KanbanColumn({
	columnId,
	children,
	className,
	'aria-label': ariaLabel,
}: KanbanColumnProps) {
	const { columnItemIds, interactive, activeId } = useKanbanContext()

	const itemIds = columnItemIds[columnId] ?? []

	const { setNodeRef, isOver } = useDroppable({ id: columnId, disabled: !interactive })

	const over = interactive && isOver && activeId !== null

	const value = useMemo(() => ({ columnId }), [columnId])

	return (
		<KanbanColumnContext value={value}>
			<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
				<section
					ref={setNodeRef}
					data-slot="kanban-column"
					data-column-id={columnId}
					data-over={over || undefined}
					// Name the column from its rendered title; an explicit aria-label wins.
					aria-label={ariaLabel}
					aria-labelledby={ariaLabel ? undefined : kanbanColumnTitleId(columnId)}
					className={cn(k.column.base, over && k.column.over, className)}
				>
					{children}
				</section>
			</SortableContext>
		</KanbanColumnContext>
	)
}
