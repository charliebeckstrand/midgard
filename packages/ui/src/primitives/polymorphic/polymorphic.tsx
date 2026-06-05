'use client'

import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from 'react'
import { type LinkProps, useLink } from '../link'

/**
 * An `href`-driven link switch with element polymorphism. The sole runtime
 * branch is on `href`:
 *
 *   - `href` present  → render the app-registered router link (`useLink`)
 *   - `href` absent   → render the `as` element
 *
 * `as` selects the *non-link* element and accepts any `ElementType` — an
 * intrinsic tag (`as="div"`, `as="span"`) or a custom component. It is the
 * fallback arm only: `href` always wins, so `as="div" href="x"` renders a link,
 * never a `<div href>`. A navigating non-anchor has no use, so this loses
 * nothing. If you need a clickable element whose `href` bypasses the router,
 * reach for a Slot escape hatch — this is not that tool.
 *
 * The type-level union below gates `href` so the non-link arm can't receive it,
 * plus centralized `data-slot` / `className` / `ref` forwarding and router
 * integration.
 */

/** Props for `Polymorphic` — strips `href` from the fallback arm so it can't be passed accidentally. */
export type PolymorphicProps<Fallback extends ElementType, Omitted extends PropertyKey = never> =
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<Fallback>, 'className' | Omitted>)
	| ({ href: string } & Omit<LinkProps, 'className' | Omitted>)

/** Renders the registered link component when `href` is present, the `as` element otherwise. */
export function Polymorphic<Fallback extends ElementType>({
	as,
	href,
	ref,
	'data-slot': slot,
	className,
	children,
	...rest
}: {
	as: Fallback
	href?: string
	ref?: Ref<Element>
	'data-slot': string
	className: string
	children: ReactNode
} & (
	| Omit<ComponentPropsWithoutRef<Fallback>, 'href' | 'ref' | 'className' | 'children'>
	| Omit<LinkProps, 'href' | 'ref' | 'className' | 'children'>
)) {
	const { component: LinkComponent } = useLink()

	if (href !== undefined) {
		return (
			<LinkComponent
				ref={ref as Ref<HTMLAnchorElement>}
				data-slot={slot}
				href={href}
				className={className}
				{...(rest as Omit<LinkProps, 'href' | 'className'>)}
			>
				{children}
			</LinkComponent>
		)
	}

	// `as as ElementType` is load-bearing: spreading `{...rest}` onto a variable
	// typed as a union of string tags collapses its props to the `never`
	// intersection of every branch. Widening to `ElementType` escapes that. The
	// cast is unrelated to the generic and stays regardless of how `as` is typed.
	const Element = as as ElementType

	return (
		<Element
			ref={ref}
			data-slot={slot}
			type={as === 'button' ? 'button' : undefined}
			className={className}
			{...(rest as ComponentPropsWithoutRef<Fallback>)}
		>
			{children}
		</Element>
	)
}
