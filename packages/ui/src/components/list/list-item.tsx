'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/list'
import { useListContext, useListItemContext } from './context'
import { ListHandle } from './list-handle'

export type ListItemProps = {
	/** Content rendered before the main content; replaces the auto-inserted `<ListHandle>` when provided. */
	prefix?: ReactNode
	/** Content rendered after the main content. */
	suffix?: ReactNode
	children?: ReactNode
	className?: string
}

export function ListItem({ prefix, suffix, children, className }: ListItemProps) {
	const { id, setNodeRef, attributes, style, dragging } = useListItemContext()

	const { variant, sortable, interactive, liftedId, onItemKeyDown, onItemBlur } = useListContext()

	const { space } = useDensity()

	const lifted = liftedId === id

	// dnd-kit's attributes set role="button", overriding the <li> semantics.
	// Drop the role; keep the focus/aria hints.
	const { role: _role, tabIndex, ...dragAttrs } = attributes

	return (
		<li
			ref={setNodeRef}
			style={style}
			tabIndex={interactive ? (tabIndex ?? 0) : undefined}
			onKeyDown={
				interactive
					? (e: KeyboardEvent) => {
							// Keys bubbling from focusable descendants (buttons, inputs)
							// belong to them, not the reorder gestures.
							if (e.target !== e.currentTarget) return

							onItemKeyDown(id, e)
						}
					: undefined
			}
			onBlur={interactive ? onItemBlur : undefined}
			{...(interactive ? dragAttrs : {})}
			data-slot="list-item"
			data-item-id={id}
			data-active={dragging || undefined}
			data-lifted={lifted || undefined}
			className={cn(k.item({ variant, density: space, active: dragging, lifted }), className)}
		>
			{prefix ?? (sortable ? <ListHandle /> : null)}
			<div className={k.content}>{children}</div>
			{suffix && suffix}
		</li>
	)
}
