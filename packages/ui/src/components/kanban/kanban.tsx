'use client'

import { closestCorners, DndContext, DragOverlay } from '@dnd-kit/core'
import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useSortableSensors } from '../../hooks'
import { k } from '../../recipes/kata/kanban'
import { KanbanContext } from './context'
import type { KanbanColumnBase } from './types'
import { useKanbanDrag } from './use-kanban-drag'
import { useKanbanKeyboard } from './use-kanban-keyboard'

/**
 * Props for {@link Kanban}: the ordered `columns`, an item `getKey`, the
 * `onValueChange` reorder sink, and the `disabled` interaction flag.
 *
 * @typeParam T - Item datum carried by each column.
 * @typeParam C - Column shape, extending {@link KanbanColumnBase}.
 */
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

/**
 * Multi-column board over `@dnd-kit`. Reorders cards within and across columns
 * by pointer drag (with a drag overlay) or keyboard lift, emitting the next
 * `columns` array through `onValueChange`; the board is read-only when
 * `onValueChange` is omitted or `disabled` is set. Shares drag/keyboard state
 * with descendant {@link KanbanColumn} and {@link KanbanCard} via context.
 * Compose the column header/body slots within.
 *
 * @remarks
 * Client component. The board is a named `role="region"` (`<section>`); pass
 * `aria-label`.
 *
 * @typeParam T - Item datum carried by each column.
 * @typeParam C - Column shape, extending {@link KanbanColumnBase}.
 */
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

	const sensors = useSortableSensors({ keyboard: false })

	const {
		activeId,
		overlayMap,
		columnItemIds,
		handleDragStart: rawDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	} = useKanbanDrag({ columns, getKey, onValueChange })

	const containerRef = useRef<HTMLElement>(null)

	const { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur } = useKanbanKeyboard({
		columns,
		getKey,
		onValueChange,
		containerRef,
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
		<KanbanContext value={contextValue}>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={interactive ? handleDragStart : undefined}
				onDragOver={interactive ? handleDragOver : undefined}
				onDragEnd={interactive ? handleDragEnd : undefined}
				onDragCancel={interactive ? handleDragCancel : undefined}
			>
				<section
					ref={containerRef}
					aria-label={ariaLabel}
					data-slot="kanban"
					className={cn(k.base, className)}
				>
					{children}
				</section>
				{interactive ? (
					<DragOverlay dropAnimation={null}>
						{activeId ? (
							<div
								data-slot="kanban-card"
								data-card-id={activeId}
								data-overlay="true"
								className={cn(k.card.base, k.card.draggable, k.card.active)}
							>
								{overlayMap.current.get(activeId)}
							</div>
						) : null}
					</DragOverlay>
				) : null}
			</DndContext>
		</KanbanContext>
	)
}
