'use client'

import type { ReactNode } from 'react'
import { noop } from '../../utilities'
import { ListItemContext } from './context'

type ListItemStaticProps = {
	id: string
	children: ReactNode
}

export function ListItemStatic({ id, children }: ListItemStaticProps) {
	return (
		<ListItemContext
			value={{
				id,
				setNodeRef: noop,
				setActivatorNodeRef: noop,
				attributes: {} as never,
				listeners: undefined,
				style: {},
				dragging: false,
			}}
		>
			{children}
		</ListItemContext>
	)
}
