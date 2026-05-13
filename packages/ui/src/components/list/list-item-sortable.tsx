'use client'

import type { ReactNode } from 'react'
import { useSortableItem } from '../../hooks'
import { ListItemProvider } from './context'

export type ListItemSortableProps = {
	id: string
	children: ReactNode
}

export function ListItemSortable({ id, children }: ListItemSortableProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging } =
		useSortableItem({ id })

	return (
		<ListItemProvider
			value={{
				id,
				setNodeRef,
				setActivatorNodeRef,
				attributes,
				listeners,
				style,
				isDragging,
			}}
		>
			{children}
		</ListItemProvider>
	)
}
