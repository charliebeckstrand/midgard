'use client'

import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../../core'
import { useMotionSafeSortable } from '../../../hooks/use-motion-safe-sortable'
import { SortableGrip } from '../../../primitives/sortable-grip/sortable-grip'
import { k } from '../../../recipes/kata/query-builder'

/** Props for {@link QueryBuilderSortableItem}. @internal */
type QueryBuilderSortableItemProps = {
	/** The id of the node, as its group's sortable list keys it. */
	id: string
	/** The name of the node, which labels its grip. */
	label: string
	disabled: boolean
	/** Whether the grip shows. A group with one child has no order to change. */
	handle: boolean
	children: ReactNode
}

/**
 * One node of a group that reorders: a grip beside the rule or the nested
 * group. The grip is the only drag activator, so the controls of the rule do
 * not start a drag. The node moves by translation alone, because a scale
 * distorts nodes of different heights.
 *
 * @internal
 */
export function QueryBuilderSortableItem({
	id,
	label,
	disabled,
	handle,
	children,
}: QueryBuilderSortableItemProps) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useMotionSafeSortable({ id, disabled: disabled || !handle })

	return (
		<div
			ref={setNodeRef}
			data-slot="query-sortable"
			data-dragging={dataAttr(isDragging)}
			style={{ transform: CSS.Translate.toString(transform), transition }}
			className={cn(k.sortable.base)}
		>
			{handle && (
				<SortableGrip
					data-slot="query-reorder-handle"
					sortable={{ setActivatorNodeRef, attributes, listeners, dragging: isDragging }}
					label={`Reorder ${label}`}
					size="sm"
					disabled={disabled}
					className={cn(k.sortable.handle)}
				/>
			)}
			<div className={cn(k.sortable.node)}>{children}</div>
		</div>
	)
}
