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
import { k } from '../../recipes/kata/kanban'
import { KanbanProvider } from './context'
import type { KanbanColumnBase } from './types'
import { useKanbanDrag } from './use-kanban-drag'
import { useKanbanKeyboard } from './use-kanban-keyboard'

export type KanbanProps<T, C extends KanbanColumnBase<T>> = {
	/** Ordered columns. Each column must have a stable `id` and an `items` array. */
	columns: C[]
	/** Stable key extractor for items. */
	getKey: (item: T) => string
	/** Called with the next columns whenever ordering changes. Omit for read-only. */
	onValueChange?: (next: C[]) => void
	/** Disable all drag / keyboard reorder interaction. */
	disabled?: boolean
	children?: ReactNode
	className?: string
	'aria-label'?: string
}

/** Multi-column board with drag-and-drop and keyboard reordering both within and across columns. */
export function Kanban<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onValueChange,
	disabled,
	children,
	className,
	'aria-label': ariaLabel,
}: KanbanProps<T, C>) {
	const interactive = !disabled && !!onValueChange

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }))

	const {
		activeId,
		overlayMap,
		columnItemIds,
		handleDragStart: rawDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	} = useKanbanDrag({ columns, getKey, onValueChange })

	const { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur } = useKanbanKeyboard({
		columns,
		getKey,
		onValueChange,
	})

	// Clear keyboard-lifted state when a pointer drag begins.
	const handleDragStart = useCallback(
		(event: Parameters<typeof rawDragStart>[0]) => {
			setLiftedCardId(null)
			rawDragStart(event)
		},
		[rawDragStart, setLiftedCardId],
	)

	const contextValue = useMemo(
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
		<KanbanProvider value={contextValue}>
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
