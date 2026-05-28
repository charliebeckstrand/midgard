'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/list'
import { useListContext, useListItemContext } from './context'
import { ListHandle } from './list-handle'

export type ListItemProps = {
	/** Content rendered before the main content — replaces the auto-inserted `<ListHandle>` when provided. */
	prefix?: ReactNode
	children?: ReactNode
	className?: string
}

export function ListItem({ prefix, children, className }: ListItemProps) {
	const { id, setNodeRef, attributes, style, dragging } = useListItemContext()

	const { variant, sortable, interactive, liftedId, onItemKeyDown, onItemBlur } = useListContext()

	const lifted = liftedId === id

	// dnd-kit hands back role="button" which would override the <li> semantics.
	// Keep the focus/aria hints, drop the role.
	const { role: _role, tabIndex, ...dragAttrs } = attributes

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
			data-active={dragging || undefined}
			data-lifted={lifted || undefined}
			className={cn(k.item({ variant, active: dragging, lifted }), className)}
		>
			{prefix ?? (sortable ? <ListHandle /> : null)}
			<div className={k.content}>{children}</div>
		</li>
	)
}
