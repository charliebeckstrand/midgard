'use client'

import type { ElementType, KeyboardEvent, ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { useDensity } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/list'
import { useListContext, useListItemContext } from './context'
import { ListHandle } from './list-handle'

/**
 * Props for {@link ListItem}: `prefix`/`suffix` slots plus the content area's
 * polymorphic `as`/`href` host attributes.
 *
 * @typeParam Fallback - Element the content area renders when `href` is absent;
 *   its props type constrains the non-link arm. Defaults to `'div'`.
 */
export type ListItemProps<Fallback extends ElementType = 'div'> = {
	/** Content rendered before the main content; replaces the auto-inserted `<ListHandle>` when provided. */
	prefix?: ReactNode
	/** Content rendered after the main content. */
	suffix?: ReactNode
	className?: string
	/**
	 * Element rendered for the content area when no `href` is given — an
	 * intrinsic tag (`'button'`, `'span'`) or a custom component. Ignored when
	 * `href` is set, which always renders the app-registered router link.
	 *
	 * @defaultValue 'div'
	 */
	as?: Fallback
	// The content area is the link switch: with `href` set it renders the
	// app-registered router link, the `as` element otherwise. `prefix` is a
	// string-typed RDFa global we repurpose as a slot; `ref` is owned by the
	// dnd-kit `<li>`.
} & PolymorphicProps<Fallback, 'prefix' | 'ref'>

/**
 * A row within a {@link List}, rendered as `<li>` with `prefix`/`suffix` slots
 * around a polymorphic content area that switches to the app's router link when
 * `href` is set and otherwise renders the `as` element (`'div'` by default). In
 * an interactive list it wires the drag/keyboard reorder bindings and
 * auto-inserts a {@link ListHandle} as the prefix unless one is supplied.
 * Density-scaled.
 *
 * @typeParam Fallback - Element the content area renders when no `href` is
 *   given; selected via `as`.
 * @remarks Client component.
 */
export function ListItem<Fallback extends ElementType = 'div'>({
	prefix,
	suffix,
	children,
	className,
	href,
	// The default is reached only when `Fallback` was left at its `'div'`
	// default, so the cast is sound at runtime.
	as = 'div' as Fallback,
	...props
}: ListItemProps<Fallback>) {
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
			data-active={dataAttr(dragging)}
			data-lifted={dataAttr(lifted)}
			className={cn(k.item({ variant, density: space, active: dragging, lifted }), className)}
		>
			{prefix ?? (sortable ? <ListHandle /> : null)}
			<Polymorphic
				as={as}
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
