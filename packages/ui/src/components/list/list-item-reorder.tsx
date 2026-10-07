'use client'

import { type DragControls, useDragControls } from 'motion/react'
import { type ReactNode, useMemo, useState } from 'react'
import { noop } from '../../utilities'
import { ListItemContext } from './context'

type ListItemReorderProps = {
	id: string
	/** The id of the hidden reorder instructions. */
	describedBy: string
	/** Whether the row moves to its new place with no animation, for reduced motion. */
	instant: boolean
	/** Called when a pointer drag of this row starts. */
	onDragStart: (id: string, controls: DragControls) => void
	/** Called when a pointer drag of this row ends. */
	onDragEnd: () => void
	children: ReactNode
}

/**
 * The row bindings of a reorderable list: the drag controls that its handle
 * starts, and the drag state of the row.
 *
 * @internal
 */
export function ListItemReorder({
	id,
	describedBy,
	instant,
	onDragStart,
	onDragEnd,
	children,
}: ListItemReorderProps) {
	const controls = useDragControls()

	const [dragging, setDragging] = useState(false)

	const value = useMemo(
		() => ({
			id,
			setNodeRef: noop,
			describedBy,
			dragging,
			reorder: {
				controls,
				instant,
				onDragStart: () => {
					setDragging(true)
					onDragStart(id, controls)
				},
				onDragEnd: () => {
					setDragging(false)
					onDragEnd()
				},
			},
		}),
		[id, describedBy, dragging, controls, instant, onDragStart, onDragEnd],
	)

	return <ListItemContext value={value}>{children}</ListItemContext>
}
