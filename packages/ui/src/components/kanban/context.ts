'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { createContext } from '../../core'
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
	/** Whether a reorderable board (one with `onReorder`) is disabled. A read-only board is never disabled. */
	disabled: boolean
	/**
	 * Whether each card id is lifted via keyboard. A card reads its own id with
	 * `useKeyedValue`.
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

/** Column-facing pointer-drag state: the active card and per-column ordering, both of which change every drag-over move. */
export type KanbanDragStateValue = {
	/** Card id currently being dragged, if any. */
	activeId: string | null
	/**
	 * The column that the dragged card moved into from another column, if any.
	 * `null` while the card is in the column that the drag started in.
	 */
	dropColumnId: string | null
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
	 * The id that the title renders with. The column `<fieldset>` refers to it
	 * through `aria-labelledby`. Each column mounts its own id, so two boards
	 * with the same column keys do not share an id.
	 */
	titleId: string
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

/**
 * Per-card state shared with its {@link KanbanCardHandle}: the card key, the
 * dnd-kit activator bindings and pointer listeners, and the id of the list item
 * that names the card.
 *
 * @internal
 */
export type KanbanCardContextValue = {
	cardId: string
	/** Whether the board takes a drag and a keyboard lift. */
	interactive: boolean
	/** dnd-kit activator ref. The handle is the node that dnd-kit focuses again after a drag. */
	setActivatorNodeRef: (node: HTMLElement | null) => void
	/** dnd-kit drag attributes: the role description, the instructions, and the disabled state. */
	attributes: DraggableAttributes
	/** dnd-kit pointer listeners. The handle takes them, so only the handle starts a drag. */
	listeners: DraggableSyntheticListeners
	/** Whether a pointer drags the card now. */
	dragging: boolean
	/** The id of the `<li>` of the card. The handle takes the name of the card from it. */
	itemId: string
	/** Handle registrar. The card warns in development when no handle mounts. */
	registerHandle: () => () => void
}

/**
 * Per-card cascade. Provided by `<KanbanCard>`; read by its handle. The drag
 * overlay copies the card content outside of a card, so the value there is
 * `null`, and the handle renders as a picture only.
 *
 * @internal
 */
export const [KanbanCardContext, useKanbanCardContext] =
	createContext<KanbanCardContextValue | null>('KanbanCard', { default: null })
