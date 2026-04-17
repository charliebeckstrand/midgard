'use client'

import type { ReactNode, RefObject } from 'react'
import { createContext } from '../../core/create-context'

export type KanbanColumnShape<T> = { id: string; items: T[] }

export type KanbanContext = {
	/** Whether cards in this board can be dragged or keyboard-reordered. */
	interactive: boolean
	/** Card id currently being dragged, if any. */
	activeId: string | null
	/** Column id → ordered card ids, for `SortableContext`. */
	columnItemIds: Record<string, string[]>
	/** Live map of card content keyed by card id, used by the drag overlay. */
	overlayMap: RefObject<Map<string, ReactNode>>
}

export const [KanbanProvider, useKanbanContext] = createContext<KanbanContext>('Kanban')

export type KanbanColumnContext = {
	columnId: string
}

export const [KanbanColumnProvider, useKanbanColumnContext] =
	createContext<KanbanColumnContext>('KanbanColumn')
