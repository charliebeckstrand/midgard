'use client'

import type { ReactNode } from 'react'
import { useSortableItem } from '../../hooks'
import { ListItemContext } from './context'

type ListItemSortableProps = {
	id: string
	children: ReactNode
}

export function ListItemSortable({ id, children }: ListItemSortableProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useSortableItem({ id })

	return (
		<ListItemContext
			value={{
				id,
				setNodeRef,
				setActivatorNodeRef,
				attributes,
				listeners,
				style,
				dragging,
			}}
		>
			{children}
		</ListItemContext>
	)
}
