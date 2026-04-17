'use client'

import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { CSSProperties } from 'react'
import { createContext } from '../../core/create-context'

export type ListContext = {
	/** Whether the list allows drag / keyboard reorder. */
	interactive: boolean
	/** Id of the item currently being dragged, if any. */
	activeId: string | null
}

export const [ListProvider, useListContext] = createContext<ListContext>('List')

export type ListItemContext = {
	id: string
	/** Ref for the draggable `<li>` element. */
	setNodeRef: (node: HTMLElement | null) => void
	/** Activator ref for the drag handle (used for keyboard focus management). */
	setActivatorNodeRef: (node: HTMLElement | null) => void
	/** a11y attributes for the drag handle. */
	attributes: DraggableAttributes
	/** Drag handle listeners — applied to `<ListHandle>`. */
	listeners: SyntheticListenerMap | undefined
	/** Transform + transition + opacity style for the `<li>`. */
	style: CSSProperties
	/** Whether this item is currently being dragged. */
	isDragging: boolean
}

export const [ListItemProvider, useListItemContext] = createContext<ListItemContext>('ListItem')
