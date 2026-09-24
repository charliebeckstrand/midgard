'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Icon } from '../../components/icon'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/dashboard'

/** Props for {@link DashboardHandle}. @internal */
export type DashboardHandleProps = {
	/** The accessibility attributes from `useDraggable`. */
	attributes: DraggableAttributes
	/** The pointer and keyboard listeners from `useDraggable`. */
	listeners: DraggableSyntheticListeners
	/** The activator ref from `useDraggable`, so dnd-kit returns focus here after a drag. */
	setActivatorNodeRef: (element: HTMLElement | null) => void
	/** The accessible name, for example "Move Revenue". */
	label: string
	/** Float the grip on the corner of a tile that has no header row. */
	floating?: boolean
	/** Whether the tile is held now, which closes the grab hand. */
	dragging?: boolean
}

/**
 * The drag grip of a tile in edit mode. It is the only drag activator of the
 * tile, so the content never starts a drag. With the keyboard, Space picks the
 * tile up, the arrow keys move it, and Space drops it.
 *
 * @internal
 */
export function DashboardHandle({
	attributes,
	listeners,
	setActivatorNodeRef,
	label,
	floating = false,
	dragging = false,
}: DashboardHandleProps) {
	return (
		<button
			data-slot="dashboard-handle"
			data-dragging={dataAttr(dragging)}
			ref={setActivatorNodeRef}
			className={cn(k.handle({ floating }))}
			{...attributes}
			{...listeners}
			type="button"
			aria-label={label}
		>
			<Icon icon={<GripVertical />} size="sm" />
		</button>
	)
}
