'use client'

import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { createContext } from '../../core/create-context'

export type KanbanColumnShape<T> = { id: string; items: T[] }

export type KanbanContext = {
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
	/** Keyboard handler for cards — pass cardId and the event. */
	onCardKeyDown: (cardId: string, event: KeyboardEvent) => void
	/** Blur handler — clears lifted state when focus leaves a card. */
	onCardBlur: () => void
}

export const [KanbanProvider, useKanbanContext] = createContext<KanbanContext>('Kanban')

export type KanbanColumnContext = {
	columnId: string
}

export const [KanbanColumnProvider, useKanbanColumnContext] =
	createContext<KanbanColumnContext>('KanbanColumn')
