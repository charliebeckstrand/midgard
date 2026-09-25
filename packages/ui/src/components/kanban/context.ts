'use client'

import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { createContext } from '../../core'
import { useLifted } from '../../hooks/use-lifted-store'
import type { KeyedStore } from '../../utilities'

/**
 * Card-facing board state: interactivity, the keyboard-lift store, the overlay map,
 * and card event handlers. Deliberately excludes the pointer-drag `activeId`
 * and per-column ordering; see {@link KanbanDragStateValue}. A pointer drag
 * churns those every move, and must not re-render every card on the board.
 */
export type KanbanContextValue = {
	/** Whether cards in this board can be dragged or keyboard-reordered. */
	interactive: boolean
	/** Whether the board is explicitly disabled (vs. merely non-interactive / read-only). */
	disabled: boolean
	/**
	 * Whether each card id is lifted via keyboard. Read one card with
	 * `useKanbanCardLifted(cardId)`.
	 *
	 * @remarks
	 * It replaces `liftedCardId`. A lifted id in the context gave the context a
	 * new value for each lift, and each card on the board rendered. The store
	 * keeps its identity, and a card that subscribes to its own id renders only
	 * when its own lift changes.
	 */
	liftedStore: KeyedStore<string, boolean>
	/** Live map of card content keyed by card id, used by the drag overlay. */
	overlayMap: RefObject<Map<string, ReactNode>>
	/** Keyboard handler for cards. It keeps its identity. */
	onCardKeyDown: (cardId: string, event: KeyboardEvent) => void
	/** Blur handler; clears lifted state when focus leaves a card. */
	onCardBlur: () => void
}

/**
 * Card-facing board cascade. Provided by `<Kanban>`; read by descendant cards
 * (and columns, for the shared interactivity flag).
 *
 * @returns The enclosing {@link KanbanContextValue}.
 * @throws When no `<Kanban>` is mounted above the caller.
 */
export const [KanbanContext, useKanbanContext] = createContext<KanbanContextValue>('Kanban')

/**
 * Whether the card `cardId` of the enclosing `<Kanban>` is lifted via keyboard.
 *
 * @returns `true` while the card is lifted. The caller renders only when the
 * lift of this card changes, not for the lift of another card.
 * @throws When no `<Kanban>` is mounted above the caller.
 */
export function useKanbanCardLifted(cardId: string): boolean {
	return useLifted(useKanbanContext().liftedStore, cardId)
}

/** Column-facing pointer-drag state: the active card and per-column ordering, both of which change every drag-over move. */
export type KanbanDragStateValue = {
	/** Card id currently being dragged, if any. */
	activeId: string | null
	/** Column id → ordered card ids, for `SortableContext`. */
	columnItemIds: Record<string, string[]>
}

/**
 * Column-facing pointer-drag cascade, split from {@link KanbanContext} so its
 * per-move churn is confined to columns and never reaches cards. Provided by
 * `<Kanban>`; read by descendant columns.
 *
 * @returns The enclosing {@link KanbanDragStateValue}.
 * @throws When no `<Kanban>` is mounted above the caller.
 */
export const [KanbanDragStateContext, useKanbanDragState] =
	createContext<KanbanDragStateValue>('Kanban')

/** Per-column state shared with its cards and title: the column `id` and the title-slot registrar driving `aria-labelledby`. */
export type KanbanColumnContextValue = {
	columnId: string
	/** Title-slot registrar; the column emits `aria-labelledby` only while a title is mounted. */
	registerTitle: () => () => void
	/**
	 * The card keys the board's `columns` entry holds for this column.
	 *
	 * @remarks
	 * Development only, and empty in a production build. One development check
	 * reads it, and the board's data changes on every drag-over move. Carrying
	 * that here in production would change this value's identity per move.
	 * `KanbanCard`'s memo holds the board still through a drag, and it holds
	 * because this value does not change.
	 */
	itemIds: readonly string[]
}

/**
 * Per-column cascade. Provided by `<KanbanColumn>`; read by its cards and title.
 *
 * @returns The enclosing {@link KanbanColumnContextValue}.
 * @throws When no `<KanbanColumn>` is mounted above the caller.
 */
export const [KanbanColumnContext, useKanbanColumnContext] =
	createContext<KanbanColumnContextValue>('KanbanColumn')

/** Id the column's title renders with; the column `<section>` references it via `aria-labelledby`. */
export const kanbanColumnTitleId = (columnId: string) => `kanban-column-title-${columnId}`
