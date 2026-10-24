'use client'

import type { ComponentProps, ElementType } from 'react'
import { type LinkProps, useLink } from '../link'
import { PolymorphicStatic } from './polymorphic-static'
import type { PolymorphicRenderProps } from './types'

/** Props for `Polymorphic`; the fallback arm excludes `href`. */
export type PolymorphicProps<Fallback extends ElementType, Omitted extends PropertyKey = never> =
	| ({
			/** The link target. With it, the element is the registered link. Without it, the element is the fallback. */
			href?: never
	  } & Omit<ComponentProps<Fallback>, 'className' | Omitted>)
	| ({
			/** The link target. With it, the element is the registered link. Without it, the element is the fallback. */
			href: string
	  } & Omit<LinkProps, 'className' | Omitted>)

/**
 * Renders the registered link component when `href` is present, the `as` element
 * otherwise. `as` is an intrinsic tag (`as="div"`) or a component, and it has no
 * effect when `href` is present. The props type removes `href` from the arm of
 * the `as` element.
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
