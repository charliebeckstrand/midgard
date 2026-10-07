'use client'

import { type DragControls, Reorder, useDragControls } from 'motion/react'
import { type KeyboardEvent, type PointerEvent, type ReactNode, useState } from 'react'
import { cn, dataAttr } from '../../../core'
import { SortableGrip } from '../../../primitives/sortable-grip/sortable-grip'
import { k } from '../../../recipes/kata/query-builder'

/** Props for {@link QueryBuilderSortableItem}. @internal */
type QueryBuilderSortableItemProps = {
	/** The id of the node, as its group's `Reorder.Group` keys it. */
	id: string
	/** The name of the node, which labels its grip. */
	label: string
	disabled: boolean
	/** Whether the grip shows. A group with one child has no order to change. */
	handle: boolean
	/** Whether the keyboard holds the node. */
	lifted: boolean
	/** The id of the hidden reorder instructions. */
	describedBy: string
	/** Whether the node moves to its new place with no animation, for reduced motion. */
	instant: boolean
	/** The reorder keys of the grip. */
	onKeyDown: (id: string, event: KeyboardEvent) => void
	/** Drops a keyboard lift when the grip loses focus. */
	onBlur: () => void
	/** Called when a pointer drag of this node starts. */
	onDragStart: (id: string, controls: DragControls) => void
	/** Called when a pointer drag of this node ends. */
	onDragEnd: () => void
	children: ReactNode
}

/** The transition of a node that moves with no animation. */
const INSTANT = { duration: 0 }

/**
 * One node of a group that reorders: a Motion `Reorder.Item` with a grip beside
 * the rule or the nested group. The grip is the only drag activator, so the
 * controls of the rule do not start a drag and a touch on the rule scrolls.
 * The grip also takes the reorder keys.
 *
 * @internal
 */
export function QueryBuilderSortableItem({
	id,
	label,
	disabled,
	handle,
	lifted,
	describedBy,
	instant,
	onKeyDown,
	onBlur,
	onDragStart,
	onDragEnd,
	children,
}: QueryBuilderSortableItemProps) {
	const controls = useDragControls()

	const [dragging, setDragging] = useState(false)

	// A pointer drag and a keyboard lift both hold the node.
	const held = dragging || lifted

	return (
		<Reorder.Item
			as="div"
			value={id}
			dragListener={false}
			dragControls={controls}
			transition={instant ? INSTANT : undefined}
			onDragStart={() => {
				setDragging(true)
				onDragStart(id, controls)
			}}
			onDragEnd={() => {
				setDragging(false)
				onDragEnd()
			}}
			data-slot="query-sortable"
			data-node-id={id}
			data-dragging={dataAttr(held)}
			className={cn(k.sortable.base)}
		>
			{handle && (
				<SortableGrip
					data-slot="query-reorder-handle"
					aria-describedby={describedBy}
					sortable={{
						listeners: disabled
							? undefined
							: {
									onPointerDown: (event: PointerEvent) => controls.start(event),
									onKeyDown: (event: KeyboardEvent) => onKeyDown(id, event),
									onBlur,
								},
						dragging: held,
					}}
					label={`Reorder ${label}`}
					size="sm"
					disabled={disabled}
					className={cn(k.sortable.handle)}
				/>
			)}
			<div className={cn(k.sortable.node)}>{children}</div>
		</Reorder.Item>
	)
}
