'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/kanban'
import {
	KanbanColumnContext,
	kanbanColumnTitleId,
	useKanbanContext,
	useKanbanDragState,
} from './context'

/** Props for {@link KanbanColumn}: the `value` matching a board column, with an optional accessible-name override. */
export type KanbanColumnProps = {
	/** Stable key matching an entry in the `columns` prop; the keyed-child `value` every compound in the library takes. */
	value: string
	children?: ReactNode
	className?: string
	/** Explicit name for the column section. Defaults to the rendered `KanbanColumnTitle`. */
	'aria-label'?: string
}

/**
 * Drop target and sortable context for one board column, keyed by `value`.
 * Highlights while a card hovers over it, and provides column context to its
 * cards and title. It names its `<section>` from a mounted
 * {@link KanbanColumnTitle}, or from an explicit `aria-label`. Compose {@link KanbanColumnHeader} and
 * {@link KanbanColumnBody} within.
 *
 * @remarks Client component.
 */
export function KanbanColumn({
	value: columnId,
	children,
	className,
	'aria-label': ariaLabel,
}: KanbanColumnProps) {
	const { interactive } = useKanbanContext()

	const { activeId, columnItemIds } = useKanbanDragState()

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
