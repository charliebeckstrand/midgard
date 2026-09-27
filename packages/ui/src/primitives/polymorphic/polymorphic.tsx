'use client'

import type { ComponentProps, ElementType } from 'react'
import { type LinkProps, useLink } from '../link'
import { PolymorphicStatic } from './polymorphic-static'
import type { PolymorphicRenderProps } from './types'

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
	| ({ href?: never } & Omit<ComponentProps<Fallback>, 'className' | Omitted>)
	| ({ href: string } & Omit<LinkProps, 'className' | Omitted>)

/**
 * Renders the registered link component when `href` is present, the `as` element
 * otherwise.
 *
 * @typeParam Fallback - Element type rendered when no `href` is given; its props
 *   type constrains the fallback arm.
 * @remarks Client-only: reads the `<UIProvider>`-registered link from
 * {@link useLink}. Static leaves use {@link PolymorphicStatic}, which reads no
 * context and takes the router link per call site (REFERENCE §2). A link with
 * `target="_blank"` and no `rel` gets `rel="noopener noreferrer"`.
 * @see {@link PolymorphicStatic}
 */
export function Polymorphic<Fallback extends ElementType>(props: PolymorphicRenderProps<Fallback>) {
	const { component: LinkComponent } = useLink()

	// One render path for both tiers: the registered link is the `render`
	// element of `PolymorphicStatic`, which merges the resolved props into it.
	return <PolymorphicStatic {...props} render={<LinkComponent href="" />} />
}
