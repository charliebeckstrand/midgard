'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useListItemContext } from './context'
import { k } from './variants'

// ── ListItem ───────────────────────────────────────────

export type ListItemProps = {
	children?: ReactNode
	className?: string
}

export function ListItem({ children, className }: ListItemProps) {
	const { setNodeRef, style, isDragging } = useListItemContext()

	return (
		<li
			ref={setNodeRef}
			style={style}
			data-slot="list-item"
			data-active={isDragging || undefined}
			className={cn(k.item, isDragging && k.itemActive, className)}
		>
			{children}
		</li>
	)
}
