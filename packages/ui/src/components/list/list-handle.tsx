'use client'

import { GripVertical } from 'lucide-react'
import type { ComponentProps, PointerEvent } from 'react'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import { k } from '../../recipes/kata/list'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { Icon } from '../icon'
import { useListContext, useListItemContext } from './context'

/** Props for {@link ListHandle}: optional custom handle content. The `<span>` of the handle takes the rest. */
export type ListHandleProps = ComponentProps<'span'>

/**
 * Drag handle for a sortable {@link ListItem}, defaulting to a grip icon.
 * Starts the drag of the item when the list is interactive, and shows
 * a disabled grip when the list is disabled. Renders nothing in a read-only
 * list (no `onReorder`) and in a single-item list, because those lists have
 * no order to change. Decorative (`aria-hidden`); keyboard reorder lives on
 * the item.
 *
 * @remarks Client component.
 */
export function ListHandle({ children, className, onPointerDown, ...props }: ListHandleProps) {
	const { interactive, disabled, itemCount } = useListContext()

	const { reorder, dragging } = useListItemContext()

	// A list that cannot reorder shows no grip. A disabled list keeps a muted one.
	if (itemCount <= 1 || (!interactive && !disabled)) return null

	const startDrag = (event: PointerEvent<HTMLSpanElement>) => {
		holdTextSelection(event)

		reorder?.controls.start(event)
	}

	return (
		<span
			data-slot="list-handle"
			{...props}
			aria-hidden="true"
			data-dragging={dataAttr(dragging)}
			data-disabled={dataAttr(disabled)}
			className={cn(k.handle, className)}
			// The drag start is the activation of the handle, so a consumer's
			// preventDefault() does not cancel it (CONVENTIONS.md §3.9).
			onPointerDown={
				interactive
					? composeEventHandlers(onPointerDown, startDrag, { checkForDefaultPrevented: false })
					: onPointerDown
			}
		>
			{children ?? <Icon icon={<GripVertical />} />}
		</span>
	)
}
