'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/icon'

/** The dnd-kit bindings that a {@link SortableGrip} carries. @internal */
export type SortableGripBindings = {
	/** The activator ref, so dnd-kit returns the focus to the grip after a drag. */
	setActivatorNodeRef: (element: HTMLElement | null) => void
	/** The accessibility attributes of the sortable. */
	attributes: DraggableAttributes
	/** The pointer and keyboard listeners of the sortable. */
	listeners: DraggableSyntheticListeners
	/** Whether the item is held now, which closes the grab hand. */
	dragging: boolean
}

/** Props for {@link SortableGrip}. @internal */
export type SortableGripProps = Omit<ComponentProps<'button'>, 'ref' | 'type'> & {
	/** The bindings of the sortable item that the grip drags. */
	sortable: SortableGripBindings
	/** The accessible name, for example "Reorder Revenue". */
	label?: string
	/** The size step of the default grip icon. By default the icon takes the step of its density scope. */
	size?: ScaleStep<typeof scale>
}

/**
 * The drag grip of a sortable item: a native `<button>` that takes the dnd-kit
 * activator ref, attributes, and listeners. It is the only part of the item
 * that starts a drag, so the rest of the item keeps its controls and its touch
 * scrolling.
 *
 * @remarks
 * The `role="button"` of dnd-kit is redundant on a native `<button>`, so the
 * grip drops it. The attributes and the listeners of the sortable come after
 * the consumer props, so a stray prop cannot remove the tab stop or the
 * pressed state. `data-dragging` closes the grab hand while the item is held.
 * The children replace the default grip icon. A primitive never imports
 * `<Icon>` from `components/`, so the grip icon takes the same attributes and
 * the same icon ramp as an `<Icon>` here.
 *
 * @internal
 */
export function SortableGrip({
	sortable,
	label,
	size,
	children,
	className,
	...props
}: SortableGripProps) {
	const { setActivatorNodeRef, attributes, listeners, dragging } = sortable

	const { role: _role, ...gripAttributes } = attributes

	return (
		<button
			aria-label={label}
			{...props}
			ref={setActivatorNodeRef}
			{...gripAttributes}
			{...listeners}
			type="button"
			data-dragging={dataAttr(dragging)}
			className={cn(className)}
		>
			{children ?? (
				<GripVertical
					aria-hidden="true"
					data-slot="icon"
					data-density={size}
					className={cn('shrink-0', k.ramp)}
				/>
			)}
		</button>
	)
}
