'use client'

import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/list'
import { Icon } from '../icon'
import { useListContext, useListItemContext } from './context'

/** Props for {@link ListHandle}: optional custom handle content plus `className`. */
export type ListHandleProps = {
	children?: ReactNode
	className?: string
}

/**
 * Drag handle for a sortable {@link ListItem}, defaulting to a grip icon.
 * Carries the item's drag listeners when the list is interactive and renders
 * nothing for a single-item list. Decorative (`aria-hidden`); keyboard reorder
 * lives on the item.
 *
 * @remarks Client component.
 */
export function ListHandle({ children, className }: ListHandleProps) {
	const { interactive, disabled, itemCount } = useListContext()

	const { listeners } = useListItemContext()

	if (itemCount <= 1) return null

	return (
		<span
			aria-hidden="true"
			data-slot="list-handle"
			data-disabled={dataAttr(disabled)}
			data-readonly={dataAttr(!interactive && !disabled)}
			className={cn(k.handle, className)}
			{...(interactive ? listeners : {})}
		>
			{children ?? <Icon icon={<GripVertical />} />}
		</span>
	)
}
