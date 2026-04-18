'use client'

import {
	closestCorners,
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { type KanbanColumnShape, KanbanProvider } from './context'
import { useKanbanDrag } from './use-kanban-drag'
import { useKanbanKeyboard } from './use-kanban-keyboard'
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

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }))

	const {
		activeId,
		overlayMap,
		columnItemIds,
		handleDragStart: rawDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	} = useKanbanDrag({ columns, getItemKey, onChange })

	const { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur } = useKanbanKeyboard({
		columns,
		getItemKey,
		onChange,
	})

	// Clear keyboard-lifted state when a pointer drag begins.
	const handleDragStart = useCallback(
		(event: Parameters<typeof rawDragStart>[0]) => {
			setLiftedCardId(null)
			rawDragStart(event)
		},
		[rawDragStart, setLiftedCardId],
	)

	const ctxValue = useMemo(
		() => ({
			interactive,
			activeId,
			liftedCardId,
			columnItemIds,
			overlayMap,
			onCardKeyDown,
			onCardBlur,
		}),
		[interactive, activeId, liftedCardId, columnItemIds, overlayMap, onCardKeyDown, onCardBlur],
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
