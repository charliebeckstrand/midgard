'use client'

import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/list'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { Icon } from '../icon'
import { useListContext, useListItemContext } from './context'

/** Props for {@link ListHandle}: optional custom handle content plus `className`. */
export type ListHandleProps = {
	children?: ReactNode
	className?: string
}

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
export function ListHandle({ children, className }: ListHandleProps) {
	const { interactive, disabled, itemCount } = useListContext()

	const { reorder, dragging } = useListItemContext()

	// A list that cannot reorder shows no grip. A disabled list keeps a muted one.
	if (itemCount <= 1 || (!interactive && !disabled)) return null

	return (
		<span
			aria-hidden="true"
			data-slot="list-handle"
			data-dragging={dataAttr(dragging)}
			data-disabled={dataAttr(disabled)}
			className={cn(k.handle, className)}
			onPointerDown={
				interactive
					? (event) => {
							holdTextSelection(event)

							reorder?.controls.start(event)
						}
					: undefined
			}
		>
			{children ?? <Icon icon={<GripVertical />} />}
		</span>
	)
}
