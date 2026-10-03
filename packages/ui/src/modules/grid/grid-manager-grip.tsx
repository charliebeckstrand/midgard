'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Icon } from '../../components/icon'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid-group'

/** The sortable bindings a {@link GridManagerGrip} carries. @internal */
type GridManagerGripSortable = {
	setActivatorNodeRef: (node: HTMLElement | null) => void
	attributes: DraggableAttributes
	listeners: DraggableSyntheticListeners
	dragging: boolean
}

/**
 * The drag grip of a row or a group in a manager dialog. With `sortable`, it
 * is the drag activator, a button with `label` as its name. Without one, it is
 * the static grip of a drag overlay, which shows the held hand.
 *
 * @internal
 */
export function GridManagerGrip({
	sortable,
	label,
}: {
	sortable?: GridManagerGripSortable
	/** The accessible name of the activator. */
	label?: string
}) {
	if (!sortable) {
		return (
			<span data-dragging="" className={cn(k.manager.row.grip)}>
				<Icon icon={<GripVertical />} />
			</span>
		)
	}

	const { setActivatorNodeRef, attributes, listeners, dragging } = sortable

	// The grip is a native `<button>`, so the `role="button"` of dnd-kit is redundant.
	const { role: _role, ...gripAttributes } = attributes

	return (
		<button
			type="button"
			ref={setActivatorNodeRef}
			data-dragging={dataAttr(dragging)}
			className={cn(k.manager.row.grip)}
			aria-label={label}
			{...gripAttributes}
			{...listeners}
		>
			<Icon icon={<GripVertical />} />
		</button>
	)
}
