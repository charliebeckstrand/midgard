'use client'

import type { ComponentPropsWithoutRef, ElementType, JSX, ReactNode, Ref } from 'react'
import { type LinkProps, useLink } from '../link'

/**
 * An `href`-driven link switch, not consumer-driven polymorphism. Despite the
 * name and the `as` prop, the consumer never chooses the tag: `as` is fixed by
 * the component author (`as="div"` in Box, `as="span"` in Badge, …) and selects
 * only the *non-link* fallback element. The single runtime branch is on `href`:
 *
 *   - `href` present  → render the app-registered router link (`useLink`)
 *   - `href` absent   → render the fixed `as` element
 *
 * The payoff is the type-level union below — `href` is gated so a plain element
 * can't accidentally receive it — plus centralized `data-slot` / `className` /
 * `ref` forwarding and router integration. If you want a surface to be optionally
 * clickable-as-a-link, reach for this; it is not a general `as`-polymorphism tool.
 */

/** Props for `Polymorphic` — strips `href` from the fallback arm so it can't be passed accidentally. */
export type PolymorphicProps<
	Fallback extends keyof JSX.IntrinsicElements,
	Omitted extends PropertyKey = never,
> =
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<Fallback>, 'className' | Omitted>)
	| ({ href: string } & Omit<LinkProps, 'className' | Omitted>)

/** Renders the registered link component when `href` is present, the fallback intrinsic element otherwise. */
export function Polymorphic<Fallback extends keyof JSX.IntrinsicElements>({
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
