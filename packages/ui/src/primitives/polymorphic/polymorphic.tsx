'use client'

import type { ComponentPropsWithoutRef, ElementType, Ref } from 'react'
import { type LinkProps, useLink } from '../link'
import { type PolymorphicRenderProps, renderFallback } from './fallback'

/**
 * An `href`-driven link switch with element polymorphism. The sole runtime
 * branch is on `href`:
 *
 *   - `href` present  → render the app-registered router link (`useLink`)
 *   - `href` absent   → render the `as` element
 *
 * `as` selects the non-link fallback element, an intrinsic tag
 * (`as="div"`, `as="span"`) or a custom component, and is ignored when
 * `href` is present. The type-level union excludes `href` from the
 * non-link arm and centralizes `data-slot` / `className` / `ref`
 * forwarding and router integration.
 */

/** Props for `Polymorphic`; the fallback arm excludes `href`. */
export type PolymorphicProps<Fallback extends ElementType, Omitted extends PropertyKey = never> =
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<Fallback>, 'className' | Omitted>)
	| ({ href: string } & Omit<LinkProps, 'className' | Omitted>)

/**
 * Renders the registered link component when `href` is present, the `as` element
 * otherwise.
 *
 * @typeParam Fallback - Element type rendered when no `href` is given; its props
 *   type constrains the fallback arm.
 * @remarks Client-only: reads the `<UIProvider>`-registered link from
 * {@link useLink}. Static leaves use {@link PolymorphicStatic}, which reads no
 * context and takes the router link per call site (REFERENCE §2).
 * @see {@link PolymorphicStatic}
 */
export function Polymorphic<Fallback extends ElementType>({
	as,
	href,
	ref,
	'data-slot': slot,
	className,
	children,
	...rest
}: PolymorphicRenderProps<Fallback>) {
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

	return renderFallback({
		as,
		ref,
		slot,
		className,
		children,
		rest: rest as ComponentPropsWithoutRef<Fallback>,
	})
}
