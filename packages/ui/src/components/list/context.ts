'use client'

import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createContext } from '../../core'
import type { ListVariant } from '../../recipes/kata/list'

/** List-wide state shared with items: variant, interactivity/disabled flags, active/lifted ids, item count, the sortable flag, and item event handlers. */
export type ListContextValue = {
	/** Visual variant; see `List.variant` for semantics. */
	variant: ListVariant
	/** Whether the list allows drag / keyboard reorder. */
	interactive: boolean
	/** Whether the list is explicitly disabled (vs. merely non-interactive / read-only). */
	disabled: boolean
	/** Id of the item currently being dragged, if any. */
	activeId: string | null
	/** Id of the item "lifted" via keyboard (Space), if any. */
	liftedId: string | null
	/** Number of items in the list. */
	itemCount: number
	/** Whether `<ListItem>` should auto-insert a `<ListHandle>`. */
	sortable: boolean
	/** Keyboard handler for list items: Space lifts, arrows move / navigate. */
	onItemKeyDown: (id: string, event: KeyboardEvent) => void
	/** Blur handler that drops any active keyboard lift. */
	onItemBlur: () => void
}

export const [ListContext, useListContext] = createContext<ListContextValue>('List')

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
	listeners: SyntheticListenerMap | undefined
	/** Transform + transition + opacity style for the `<li>`. */
	style: CSSProperties
	/** Whether this item is currently being dragged. */
	dragging: boolean
}

export const [ListItemContext, useListItemContext] = createContext<ListItemContextValue>('ListItem')
