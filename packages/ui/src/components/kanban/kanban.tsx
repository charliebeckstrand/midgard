'use client'

import { closestCorners, DndContext, DragOverlay } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { cn } from '../../core'
import { useSortableSensors } from '../../hooks'
import { type KanbanColumnShape, KanbanProvider } from './context'
import { useKanbanDrag } from './use-kanban-drag'
import { k } from './variants'

export type { KanbanColumnShape }

export type KanbanProps<T, C extends KanbanColumnShape<T>> = {
	/** Ordered columns. Each column must have a stable `id` and an `items` array. */
	columns: C[]
	/** Stable key extractor for items. */
	getItemKey: (item: T) => string
	/** Called with the next columns whenever ordering changes. Omit for read-only. */
	onChange?: (next: C[]) => void
	/** Disable all drag / keyboard reorder interaction. */
	disabled?: boolean
	children?: ReactNode
	className?: string
	'aria-label'?: string
}

export function Kanban<T, C extends KanbanColumnShape<T>>({
	columns,
	getItemKey,
	onChange,
	disabled,
	children,
	className,
	'aria-label': ariaLabel,
}: KanbanProps<T, C>) {
	const interactive = !disabled && !!onChange

	const sensors = useSortableSensors()

	const {
		activeId,
		overlayMap,
		columnItemIds,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	} = useKanbanDrag({ columns, getItemKey, onChange })

	const ctxValue = useMemo(
		() => ({ interactive, activeId, columnItemIds, overlayMap }),
		[interactive, activeId, columnItemIds, overlayMap],
	)

	return (
		<KanbanProvider value={ctxValue}>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={interactive ? handleDragStart : undefined}
				onDragOver={interactive ? handleDragOver : undefined}
				onDragEnd={interactive ? handleDragEnd : undefined}
				onDragCancel={interactive ? handleDragCancel : undefined}
			>
				<section aria-label={ariaLabel} data-slot="kanban" className={cn(k.base, className)}>
					{children}
				</section>
				{interactive ? (
					<DragOverlay dropAnimation={null}>
						{activeId ? (
							<div
								data-slot="kanban-card"
								data-card-id={activeId}
								data-overlay="true"
								className={cn(k.card, k.cardDraggable, k.cardActive)}
							>
								{overlayMap.current.get(activeId)}
							</div>
						) : null}
					</DragOverlay>
				) : null}
			</DndContext>
		</KanbanProvider>
	)
}
