'use client'

import type { ReactNode } from 'react'
import { noop } from '../../helpers'
import { ListItemProvider } from './context'

export type ListItemStaticProps = {
	id: string
	children: ReactNode
}

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
