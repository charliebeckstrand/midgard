'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createContext } from '../../core'
import { useKeyedValue } from '../../hooks/use-keyed-store'
import type { ListVariant } from '../../recipes/kata/list'
import type { KeyedStore } from '../../utilities'

/** List-wide state shared with items: variant, interactivity/disabled flags, the keyboard-lift store, item count, the handle flag, and item event handlers. */
export type ListContextValue = {
	/** Visual variant; see `List.variant` for semantics. */
	variant: ListVariant
	/** Whether the list allows drag / keyboard reorder. */
	interactive: boolean
	/** Whether a `<ListSortable>` is disabled. A read-only `<List>` is never disabled. */
	disabled: boolean
	/**
	 * Whether each item id is "lifted" via keyboard (Space). Read one item with
	 * `useListItemLifted(id)`.
	 *
	 * @remarks
	 * It replaces `liftedId`. A lifted id in the context gave the context a new
	 * value for each lift, and each item rendered. The store keeps its identity,
	 * and an item that subscribes to its own id renders only when its own lift
	 * changes.
	 */
	liftedStore: KeyedStore<string, boolean>
	/** Number of items in the list. */
	itemCount: number
	/** Whether `<ListItem>` must auto-insert a `<ListHandle>`. */
	handle: boolean
	/** Keyboard handler for list items: Space lifts, arrows move / navigate. It keeps its identity. */
	onItemKeyDown: (id: string, event: KeyboardEvent) => void
	/** Blur handler that drops any active keyboard lift. */
	onItemBlur: () => void
}

/**
 * Item-facing list cascade. Provided by `<List>` and `<ListSortable>`; read by descendant items.
 *
 * @returns The enclosing {@link ListContextValue}.
 * @throws When no `<List>` or `<ListSortable>` is mounted above the caller.
 */
export const [ListContext, useListContext] = createContext<ListContextValue>('List')

/**
 * Whether the item `id` of the enclosing `<ListSortable>` is lifted via keyboard (Space).
 *
 * @returns `true` while the item is lifted. The caller renders only when the
 * lift of this item changes, not for the lift of another item.
 * @throws When no `<List>` or `<ListSortable>` is mounted above the caller.
 */
export function useListItemLifted(id: string): boolean {
	return useKeyedValue(useListContext().liftedStore, id)
}

/** Per-item drag bindings shared with an item and its handle: the item `id`, sortable refs/attributes/listeners, transform `style`, and the `dragging` flag. */
export type ListItemContextValue = {
	id: string
	/** Ref for the draggable `<li>` element. */
	setNodeRef: (node: HTMLElement | null) => void
	/** Activator ref for the drag handle (used for keyboard focus management). */
	setActivatorNodeRef: (node: HTMLElement | null) => void
	/** a11y attributes for the drag handle. */
	attributes: DraggableAttributes
	/** Drag handle listeners; applied to `<ListHandle>`. */
	listeners: DraggableSyntheticListeners
	/** Transform + transition + opacity style for the `<li>`. */
	style: CSSProperties
	/** Whether this item is currently being dragged. */
	dragging: boolean
	/**
	 * The place of the row in a windowed list. The row writes it as `data-index`,
	 * which the window measures by, and as `aria-posinset` and `aria-setsize`,
	 * because the rows outside the window are not in the DOM to count.
	 */
	position?: { index: number; count: number }
}

/**
 * Drag-state cascade for one row. Provided by `<ListItem>`; read by its handle.
 *
 * @returns The enclosing {@link ListItemContextValue}.
 * @throws When no `<ListItem>` is mounted above the caller.
 */
export const [ListItemContext, useListItemContext] = createContext<ListItemContextValue>('ListItem')
