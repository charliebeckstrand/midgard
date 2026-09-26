'use client'

import { closestCorners, DndContext, DragOverlay } from '@dnd-kit/core'
import { type ComponentProps, type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useDragCursor, useSortableSensors } from '../../hooks'
import { useLiftedStore } from '../../hooks/use-lifted-store'
import { k } from '../../recipes/kata/kanban'
import type { AccessibleName } from '../../types'
import { KanbanContext, KanbanDragStateContext } from './context'
import type { KanbanColumnBase } from './types'
import { useKanbanDrag } from './use-kanban-drag'
import { useKanbanKeyboard } from './use-kanban-keyboard'

/**
 * Props for {@link Kanban}: the ordered `columns`, an item `getKey`, the
 * `onReorder` reorder sink, and the `disabled` interaction flag.
 *
 * @typeParam T - Item datum carried by each column.
 * @typeParam C - Column shape, extending {@link KanbanColumnBase}.
 */
export type KanbanProps<T, C extends KanbanColumnBase<T>> = AccessibleName &
	Omit<ComponentProps<'section'>, 'className' | 'children' | 'aria-label' | 'aria-labelledby'> & {
		/** Ordered columns. Each column must have a stable `id` and an `items` array. */
		columns: C[]
		/** Stable key extractor for items. */
		getKey: (item: T) => string
		/** Called with the next columns whenever ordering changes. Omit for read-only. */
		onReorder?: (next: C[]) => void
		/** Disable all drag / keyboard reorder interaction. */
		disabled?: boolean
		children?: ReactNode
		className?: string
	}

/**
 * Multi-column board over `@dnd-kit`. Reorders cards within and across columns
 * by pointer drag (with a drag overlay) or keyboard lift, and emits the next
 * `columns` array through `onReorder`. The board is read-only when `onReorder`
 * is omitted or `disabled` is set. Shares drag/keyboard state
 * with descendant {@link KanbanColumn} and {@link KanbanCard} via context.
 * Compose the column header/body slots within.
 *
 * @remarks
 * Client component. The board is a named `role="region"` (`<section>`), so the
 * type requires one of `aria-label` / `aria-labelledby`.
 *
 * **The board takes its data and its structure apart, and the keys join them.**
 * `columns` carries the ordering the board reorders, and the children carry
 * what each column and card renders. A `<KanbanColumn value>` therefore repeats
 * a key from `columns`, and a `<KanbanCard value>` repeats one from that
 * column's `items`. Nothing in the type holds the two together. A key that
 * matches nothing renders and then does nothing: an unknown column takes no
 * drop, and an unknown card never reorders. Both warn in development, at the
 * part that carries the key.
 *
 * @typeParam T - Item datum carried by each column.
 * @typeParam C - Column shape, extending {@link KanbanColumnBase}.
 */
export function Kanban<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onReorder,
	disabled,
	children,
	className,
	...labelProps
}: KanbanProps<T, C>) {
	const interactive = !disabled && !!onReorder

	const sensors = useSortableSensors({ keyboard: false })

	const {
		activeId,
		overlayMap,
		columnItemIds,
		handleDragStart: rawDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	} = useKanbanDrag({ columns, getKey, onReorder })

	// dnd-kit sets no cursor, so the element under the pointer sets it. The rule
	// holds the closed hand on the whole page until the drop or the cancel.
	useDragCursor(activeId !== null)

	const containerRef = useRef<HTMLElement>(null)

	const { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur } = useKanbanKeyboard({
		columns,
		getKey,
		onReorder,
		containerRef,
	})

	// Each card reads its own lift from the store, so a lift renders only the card
	// that lifts and the card that drops.
	const liftedStore = useLiftedStore(liftedCardId)

	// Clear keyboard-lifted state when a pointer drag begins.
	const handleDragStart = useCallback(
		(event: Parameters<typeof rawDragStart>[0]) => {
			setLiftedCardId(null)
			rawDragStart(event)
		},
		[rawDragStart, setLiftedCardId],
	)

	// Card-facing value: stays referentially stable through a pointer drag (which
	// moves only activeId/columnItemIds), so cards don't re-render per drag move.
	const contextValue = useMemo(
		() => ({
			interactive,
			disabled: !!disabled,
			liftedStore,
			overlayMap,
			onCardKeyDown,
			onCardBlur,
		}),
		[interactive, disabled, liftedStore, overlayMap, onCardKeyDown, onCardBlur],
	)

	// Column-facing drag state: churns every drag-over move; confined to columns.
	const dragStateValue = useMemo(() => ({ activeId, columnItemIds }), [activeId, columnItemIds])

	return (
		<KanbanContext value={contextValue}>
			<KanbanDragStateContext value={dragStateValue}>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCorners}
					onDragStart={interactive ? handleDragStart : undefined}
					onDragOver={interactive ? handleDragOver : undefined}
					onDragEnd={interactive ? handleDragEnd : undefined}
					onDragCancel={interactive ? handleDragCancel : undefined}
				>
					<section
						{...labelProps}
						ref={containerRef}
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
									// The pointer rides the overlay, so it shows the held hand.
									data-dragging=""
									className={cn(k.card.base, k.card.draggable, k.card.active)}
								>
									{overlayMap.current.get(activeId)}
								</div>
							) : null}
						</DragOverlay>
					) : null}
				</DndContext>
			</KanbanDragStateContext>
		</KanbanContext>
	)
}
