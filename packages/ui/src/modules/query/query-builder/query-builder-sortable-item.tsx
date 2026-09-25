'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from '../../../components/icon'
import { cn, dataAttr } from '../../../core'
import { k } from '../../../recipes/kata/query-builder'

/** Props for {@link QueryBuilderSortableItem}. @internal */
type QueryBuilderSortableItemProps = {
	/** The id of the node, as its group's sortable list keys it. */
	id: string
	/** The name of the node, which labels its grip. */
	label: string
	disabled: boolean
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
	} = useSortable({ id, disabled })

	return (
		<div
			ref={setNodeRef}
			data-slot="query-sortable"
			data-dragging={dataAttr(isDragging)}
			style={{ transform: CSS.Translate.toString(transform), transition }}
			className={cn(k.sortable.base)}
		>
			<button
				ref={setActivatorNodeRef}
				data-slot="query-reorder-handle"
				data-dragging={dataAttr(isDragging)}
				className={cn(k.sortable.handle)}
				{...attributes}
				{...listeners}
				type="button"
				aria-label={`Reorder ${label}`}
				disabled={disabled}
			>
				<Icon icon={<GripVertical />} size="sm" />
			</button>
			<div className={cn(k.sortable.node)}>{children}</div>
		</div>
	)
}
