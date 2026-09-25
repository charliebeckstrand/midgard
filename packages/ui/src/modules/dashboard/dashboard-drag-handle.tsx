'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Icon } from '../../components/icon'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/dashboard'

/** Props for {@link DashboardDragHandle}. @internal */
export type DashboardDragHandleProps = {
	/** The accessibility attributes from `useDraggable`. */
	attributes: DraggableAttributes
	/** The keyboard listener from `useDraggable`. The card takes the pointer listener. */
	listeners: DraggableSyntheticListeners
	/** The activator ref from `useDraggable`, so dnd-kit returns focus here after a drag. */
	setActivatorNodeRef: (element: HTMLElement | null) => void
	/** The accessible name, for example "Move Revenue". */
	label: string
	/** Float the grip on the corner of a tile that has no header row. */
	floating: boolean
	/** Whether the tile is held now, which closes the grab hand and turns the focus ring violet. */
	dragging: boolean
}

/**
 * The drag grip of a tile in edit mode. It is the keyboard activator of the tile,
 * and the handle on a touch screen, where the card keeps touch scrolling. The card
 * takes the pointer, so a press on the grip drags through the card. With the
 * keyboard, Space picks the tile up, the arrow keys move it, and Space drops it.
 *
 * @internal
 */
export function DashboardDragHandle({
	attributes,
	listeners,
	setActivatorNodeRef,
	label,
	floating,
	dragging,
}: DashboardDragHandleProps) {
	return (
		<button
			data-slot="dashboard-handle"
			data-dragging={dataAttr(dragging)}
			ref={setActivatorNodeRef}
			className={cn(k.handle({ floating, dragging }))}
			{...attributes}
			{...listeners}
			type="button"
			aria-label={label}
		>
			<Icon icon={<GripVertical />} size="sm" />
		</button>
	)
}
