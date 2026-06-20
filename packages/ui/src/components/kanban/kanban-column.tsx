'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { KanbanColumnContext, kanbanColumnTitleId, useKanbanContext } from './context'

/** Props for {@link KanbanColumn}: the `columnId` matching a board column, with an optional accessible-name override. */
export type KanbanColumnProps = {
	/** Stable id matching an entry in the `columns` prop. */
	columnId: string
	children?: ReactNode
	className?: string
	/** Explicit name for the column section. Defaults to the rendered `KanbanColumnTitle`. */
	'aria-label'?: string
}

/**
 * Drop target and sortable context for one board column, keyed by `columnId`.
 * Highlights while a card hovers over it, provides column context to its cards
 * and title, and names its `<section>` from a mounted {@link KanbanColumnTitle}
 * (or an explicit `aria-label`). Compose {@link KanbanColumnHeader} and
 * {@link KanbanColumnBody} within.
 *
 * @remarks Client component.
 */
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

	const [hasTitle, setHasTitle] = useState(false)

	const registerTitle = useCallback(() => {
		setHasTitle(true)

		return () => setHasTitle(false)
	}, [])

	const value = useMemo(() => ({ columnId, registerTitle }), [columnId, registerTitle])

	return (
		<KanbanColumnContext value={value}>
			<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
				<section
					ref={setNodeRef}
					data-slot="kanban-column"
					data-column-id={columnId}
					data-over={dataAttr(over)}
					// Names the column from its rendered title; an explicit aria-label
					// wins, and the reference appears only while a title is mounted.
					aria-label={ariaLabel}
					aria-labelledby={!ariaLabel && hasTitle ? kanbanColumnTitleId(columnId) : undefined}
					className={cn(k.column.base, over && k.column.over, className)}
				>
					{children}
				</section>
			</SortableContext>
		</KanbanColumnContext>
	)
}
