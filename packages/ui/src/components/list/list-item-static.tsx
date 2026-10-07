'use client'

import { type ReactNode, useMemo } from 'react'
import { noop } from '../../utilities'
import { ListItemContext } from './context'

type ListItemStaticProps = {
	id: string
	children: ReactNode
	/** The place of the row in a windowed list, and the ref that measures it. */
	windowed?: {
		index: number
		count: number
		measureRef: (node: HTMLElement | null) => void
	}
}

/**
 * Everything except `id` is constant for a static (non-sortable) item; the drag
 * overlay in `list-sortable.tsx` reuses it with `dragging: true`.
 *
 * @internal
 */
export const STATIC_CONTEXT = {
	setNodeRef: noop,
	setActivatorNodeRef: noop,
	attributes: {} as never,
	listeners: undefined,
	style: {},
	dragging: false,
} as const

export function ListItemStatic({ id, children, windowed }: ListItemStaticProps) {
	const index = windowed?.index

	const count = windowed?.count

	const measureRef = windowed?.measureRef

	const value = useMemo(
		() =>
			index === undefined || count === undefined || measureRef === undefined
				? { id, ...STATIC_CONTEXT }
				: { id, ...STATIC_CONTEXT, setNodeRef: measureRef, position: { index, count } },
		[id, index, count, measureRef],
	)

	return <ListItemContext value={value}>{children}</ListItemContext>
}
