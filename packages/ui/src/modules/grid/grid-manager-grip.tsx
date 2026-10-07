'use client'

import { GripVertical } from 'lucide-react'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import {
	SortableGrip,
	type SortableGripBindings,
} from '../../primitives/sortable-grip/sortable-grip'
import { k } from '../../recipes/kata/grid-group'

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
	sortable?: SortableGripBindings
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

	return <SortableGrip sortable={sortable} label={label} className={cn(k.manager.row.grip)} />
}
