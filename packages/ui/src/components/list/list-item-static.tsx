'use client'

import { type ReactNode, useMemo } from 'react'
import { noop } from '../../utilities'
import { ListItemContext } from './context'

type ListItemStaticProps = {
	id: string
	children: ReactNode
}

// Everything except `id` is constant for a static (non-sortable) item.
const STATIC_CONTEXT = {
	setNodeRef: noop,
	setActivatorNodeRef: noop,
	attributes: {} as never,
	listeners: undefined,
	style: {},
	dragging: false,
} as const

export function ListItemStatic({ id, children }: ListItemStaticProps) {
	const value = useMemo(() => ({ id, ...STATIC_CONTEXT }), [id])

	return <ListItemContext value={value}>{children}</ListItemContext>
}
