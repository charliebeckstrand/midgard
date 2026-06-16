'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/list'
import { useListContext, useListItemContext } from './context'
import { ListHandle } from './list-handle'

/** Props for {@link ListItem}: `prefix`/`suffix` slots plus polymorphic `as`/`href` host attributes. */
export type ListItemProps = {
	/** Content rendered before the main content; replaces the auto-inserted `<ListHandle>` when provided. */
	prefix?: ReactNode
	/** Content rendered after the main content. */
	suffix?: ReactNode
	className?: string
	// The content area is the link switch: with `href` set it renders the
	// app-registered router link, a `<div>` otherwise. `prefix` is a string-typed
	// RDFa global we repurpose as a slot; `ref` is owned by the dnd-kit `<li>`.
} & PolymorphicProps<'div', 'prefix' | 'ref'>

/**
 * A row within a {@link List}, rendered as `<li>` with `prefix`/`suffix` slots
 * around a polymorphic content area that switches to the app's router link when
 * `href` is set. In an interactive list it wires the drag/keyboard reorder
 * bindings and auto-inserts a {@link ListHandle} as the prefix unless one is
 * supplied. Density-scaled.
 *
 * @remarks Client component.
 */
export function ListItem({ prefix, suffix, children, className, href, ...props }: ListItemProps) {
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
					? (event: KeyboardEvent) => {
							// Keys bubbling from focusable descendants (buttons, inputs)
							// belong to them, not the reorder gestures.
							if (event.target !== event.currentTarget) return

							onItemKeyDown(id, event)
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
			<Polymorphic
				as="div"
				href={href}
				data-slot="list-item-content"
				className={k.content(href)}
				{...props}
			>
				{children}
			</Polymorphic>
			{suffix && suffix}
		</li>
	)
}
