'use client'

import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { createContext } from '../../core'

/** Board-wide drag/keyboard state shared with columns and cards: interactivity, active/lifted card ids, per-column ordering, the overlay map, and card event handlers. */
export type KanbanContextValue = {
	/** Whether cards in this board can be dragged or keyboard-reordered. */
	interactive: boolean
	/** Card id currently being dragged, if any. */
	activeId: string | null
	/** Card id currently lifted via keyboard, if any. */
	liftedCardId: string | null
	/** Column id → ordered card ids, for `SortableContext`. */
	columnItemIds: Record<string, string[]>
	/** Live map of card content keyed by card id, used by the drag overlay. */
	overlayMap: RefObject<Map<string, ReactNode>>
	/** Keyboard handler for cards. */
	onCardKeyDown: (cardId: string, event: KeyboardEvent) => void
	/** Blur handler; clears lifted state when focus leaves a card. */
	onCardBlur: () => void
}

export const [KanbanContext, useKanbanContext] = createContext<KanbanContextValue>('Kanban')

/** Per-column state shared with its cards and title: the column `id` and the title-slot registrar driving `aria-labelledby`. */
export type KanbanColumnContextValue = {
	columnId: string
	/** Title-slot registrar; the column emits `aria-labelledby` only while a title is mounted. */
	registerTitle: () => () => void
}

export const [KanbanColumnContext, useKanbanColumnContext] =
	createContext<KanbanColumnContextValue>('KanbanColumn')

/** Id the column's title renders with; the column `<section>` references it via `aria-labelledby`. */
export const kanbanColumnTitleId = (columnId: string) => `kanban-column-title-${columnId}`
