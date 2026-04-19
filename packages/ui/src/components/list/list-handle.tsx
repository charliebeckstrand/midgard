'use client'

import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Icon } from '../icon'
import { useListContext, useListItemContext } from './context'
import { k } from './variants'

// ── ListHandle ─────────────────────────────────────────
// Decorative pointer affordance. Focus and keyboard reorder live on the
// parent `<li>` so users tab to the item itself, not the grip.

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
