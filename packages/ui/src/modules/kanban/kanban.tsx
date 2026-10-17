'use client'

import { closestCorners, DndContext } from '@dnd-kit/core'
import { useComposedRefs } from 'motion/react'
import { type ComponentProps, useCallback, useId, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useDragCursor, useScrollRegion, useSortableSensors } from '../../hooks'
import { keyMatcher, useKeyedStore } from '../../hooks/use-keyed-store'
import { PortalDragOverlay } from '../../primitives/portal/portal-drag-overlay'
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
	Omit<ComponentProps<'section'>, 'aria-label' | 'aria-labelledby'> & {
		/** Ordered columns. Each column must have a stable `id` and an `items` array. */
		columns: C[]
		/** Stable key extractor for items. */
		getKey: (item: T) => string
		/** Called with the next columns whenever ordering changes. Omit for read-only. */
		onReorder?: (next: C[]) => void
		/**
		 * Disable all drag / keyboard reorder interaction. It has an effect only
		 * when `onReorder` is set. A board with no `onReorder` is read-only.
		 * When the board becomes disabled or read-only during a pointer drag, the
		 * drop does not move the card. The board cancels the drag, and when
		 * `onReorder` is set, it reports the columns from the drag start.
		 * @defaultValue false
		 */
		disabled?: boolean
	}

// A drop on a board that is not interactive becomes a cancel.
const cancelEveryDrop = () => true

/**
 * Multi-column board over `@dnd-kit`. Reorders cards within and across columns
 * by pointer drag (with a drag overlay) or keyboard lift, and emits the next
 * `columns` array through `onReorder`. With no `onReorder`, the board is
 * read-only: each card takes `data-readonly`, and the handles render nothing.
 * With `onReorder` and `disabled`, the board is disabled: each card takes
 * `data-disabled`, and each handle shows a muted grip. Shares drag/keyboard state
 * with descendant {@link KanbanColumn} and {@link KanbanCard} via context.
 * Compose the column header/body slots within. A pointer drags a card, and the
 * keyboard lifts a card, only from its {@link KanbanCardHandle}.
 *
 * @remarks
 * Client component. The board is a named `role="region"` (`<section>`), so the
 * type requires one of `aria-label` / `aria-labelledby`. While the columns
 * overflow the board, the board is also a tab stop. A consumer `ref` reaches
 * the `<section>` element.
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
	ref,
	...labelProps
}: KanbanProps<T, C>) {
	const interactive = !disabled && !!onReorder

	const sensors = useSortableSensors({ keyboard: false })

	// Without an id, dnd-kit makes the id of the drag description from a counter
	// that each render in the process shares, so the server markup and the
	// browser do not agree on it.
	const dndId = useId()

	const containerRef = useRef<HTMLElement>(null)

	const {
		activeId,
		dropColumnId,
		overlayMap,
		columnItemIds,
		handleDragStart: rawDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
		accessibility,
	} = useKanbanDrag({ columns, getKey, onReorder, containerRef })

	// dnd-kit sets no cursor, so the element under the pointer sets it. The rule
	// holds the closed hand on the whole page until the drop or the cancel.
	useDragCursor(activeId !== null)

	const { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur } = useKanbanKeyboard({
		columns,
		getKey,
		onReorder,
		enabled: interactive,
		containerRef,
	})

	// Each card reads its own lift from the store, so a lift renders only the card
	// that lifts and the card that drops.
	const liftedStore = useKeyedStore(liftedCardId, keyMatcher)

	// Clear keyboard-lifted state when a pointer drag begins.
	const handleDragStart = useCallback(
		(event: Parameters<typeof rawDragStart>[0]) => {
			setLiftedCardId(null)
			rawDragStart(event)
		},
		[rawDragStart, setLiftedCardId],
	)

	// The board is a named region already. While its columns overflow, it is
	// also a tab stop, so a keyboard user can scroll it.
	const scrollRegionRef = useScrollRegion()

	const boardRef = useComposedRefs(containerRef, scrollRegionRef, ref)

	// Card-facing value: stays referentially stable through a pointer drag (which
	// moves only activeId/columnItemIds), so cards don't re-render per drag move.
	const contextValue = useMemo(
		() => ({
			interactive,
			// A read-only board has no reorder to disable, so its handles stay hidden.
			disabled: !!disabled && onReorder !== undefined,
			liftedStore,
			overlayMap,
			onCardKeyDown,
			onCardBlur,
		}),
		[interactive, disabled, onReorder, liftedStore, overlayMap, onCardKeyDown, onCardBlur],
	)

	// Column-facing drag state: churns every drag-over move; confined to columns.
	const dragStateValue = useMemo(
		() => ({ activeId, dropColumnId, columnItemIds }),
		[activeId, dropColumnId, columnItemIds],
	)

	// The overlay repeats the content and the className of the card that it follows.
	const overlay = activeId ? overlayMap.current.get(activeId) : undefined

	return (
		<KanbanContext value={contextValue}>
			<KanbanDragStateContext value={dragStateValue}>
				<DndContext
					id={dndId}
					sensors={sensors}
					collisionDetection={closestCorners}
					accessibility={accessibility}
					onDragStart={interactive ? handleDragStart : undefined}
					onDragOver={interactive ? handleDragOver : undefined}
					// dnd-kit reads the handlers and `cancelDrop` at the drop, from the
					// latest props. The end and the cancel stay wired, so a drag that
					// continues after the board turns non-interactive still ends.
					// `cancelDrop` then makes the drop a cancel, and the cancel reverts.
					cancelDrop={interactive ? undefined : cancelEveryDrop}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
				>
					<section
						data-slot="kanban"
						{...labelProps}
						ref={boardRef}
						className={cn(k.base, className)}
					>
						{children}
					</section>
					{interactive ? (
						<PortalDragOverlay>
							{activeId ? (
								<div
									// The clone repeats the content of the card that it follows, and
									// can hold controls. Inert takes the copy out of the
									// accessibility tree and the tab order. The pointer drag reads
									// no event from the overlay, so the drag is not affected.
									inert
									data-slot="kanban-card"
									data-card-id={activeId}
									data-overlay="true"
									// The clone follows a live drag.
									data-dragging=""
									className={cn(k.card.base, k.card.active, overlay?.className)}
								>
									{overlay?.children}
								</div>
							) : null}
						</PortalDragOverlay>
					) : null}
				</DndContext>
			</KanbanDragStateContext>
		</KanbanContext>
	)
}
