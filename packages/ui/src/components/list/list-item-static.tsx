'use client'

import type { ReactNode } from 'react'
import { ListItemProvider } from './context'

export type ListItemStaticProps = {
	id: string
	children: ReactNode
}

const noop = () => {}

export function ListItemStatic({ id, children }: ListItemStaticProps) {
	return (
		<ListItemProvider
			value={{
				id,
				setNodeRef: noop,
				setActivatorNodeRef: noop,
				attributes: {} as never,
				listeners: undefined,
				style: {},
				isDragging: false,
			}}
		>
			{children}
		</ListItemProvider>
	)
}
