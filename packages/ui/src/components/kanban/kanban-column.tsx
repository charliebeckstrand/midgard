'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { KanbanColumnProvider, useKanbanContext } from './context'
import { k } from './variants'

export type KanbanColumnProps = {
	/** Stable id matching an entry in the `columns` prop. */
	columnId: string
	children?: ReactNode
	className?: string
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

	return (
		<KanbanColumnProvider value={{ columnId }}>
			<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
				<section
					ref={setNodeRef}
					data-slot="kanban-column"
					data-column-id={columnId}
					data-over={over || undefined}
					aria-label={ariaLabel}
					className={cn(k.column, over && k.columnOver, className)}
				>
					{children}
				</section>
			</SortableContext>
		</KanbanColumnProvider>
	)
}
