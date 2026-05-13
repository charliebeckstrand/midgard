'use client'

import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/list'
import { Icon } from '../icon'
import { useListContext, useListItemContext } from './context'

export type ListHandleProps = {
	children?: ReactNode
	className?: string
}

export function ListHandle({ children, className }: ListHandleProps) {
	const { interactive, itemCount } = useListContext()

	const { listeners } = useListItemContext()

	if (itemCount <= 1) return null

	return (
		<span
			aria-hidden="true"
			data-slot="list-handle"
			data-disabled={!interactive || undefined}
			className={cn(k.handle, className)}
			{...(interactive ? listeners : {})}
		>
			{children ?? <Icon icon={<GripVertical />} />}
		</span>
	)
}
