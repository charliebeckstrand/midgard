'use client'

import { type ReactNode, useMemo } from 'react'
import { useSortableItem } from '../../hooks'
import { ListItemContext } from './context'

type ListItemSortableProps = {
	id: string
	children: ReactNode
}

export function ListItemSortable({ id, children }: ListItemSortableProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useSortableItem({ id })

	// dnd-kit renders each item again when the item under the pointer changes. A
	// value that keeps its identity holds the rows that did not move.
	const value = useMemo(
		() => ({ id, setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging }),
		[id, setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging],
	)

	return <ListItemContext value={value}>{children}</ListItemContext>
}
