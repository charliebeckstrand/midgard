'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../core'
import { useListContext, useListItemContext } from './context'
import { ListHandle } from './list-handle'
import { k } from './variants'

// ── ListItem ───────────────────────────────────────────

export type ListItemProps = {
	children?: ReactNode
	className?: string
}

export function ListItem({ children, className }: ListItemProps) {
	const { id, setNodeRef, attributes, style, isDragging } = useListItemContext()

	const { sortable, interactive, liftedId, onItemKeyDown, onItemBlur } = useListContext()

	const lifted = liftedId === id

	// dnd-kit hands back role="button" which would override the <li> semantics.
	// Keep the focus/aria hints, drop the role.
	const {
		role: _role,
		tabIndex,
		...dragAttrs
	} = (attributes ?? {}) as Partial<typeof attributes> & { role?: string; tabIndex?: number }

	return (
		<li
			ref={setNodeRef}
			style={style}
			tabIndex={interactive ? (tabIndex ?? 0) : undefined}
			onKeyDown={interactive ? (e: KeyboardEvent) => onItemKeyDown(id, e) : undefined}
			onBlur={interactive ? onItemBlur : undefined}
			{...(interactive ? dragAttrs : {})}
			data-slot="list-item"
			data-item-id={id}
			data-active={isDragging || undefined}
			data-lifted={lifted || undefined}
			className={cn(k.item, isDragging && k.itemActive, lifted && k.itemLifted, className)}
		>
			{sortable ? <ListHandle /> : null}
			<div className={k.content}>{children}</div>
		</li>
	)
}
