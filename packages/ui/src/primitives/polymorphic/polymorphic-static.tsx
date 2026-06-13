import {
	type ComponentPropsWithoutRef,
	cloneElement,
	type ElementType,
	type ReactElement,
	type ReactNode,
	type Ref,
} from 'react'
import type { LinkProps } from '../link'

/**
 * Server-safe sibling of `Polymorphic`: the same `href`-driven link switch
 * with element polymorphism, minus the LinkContext read. The `href` arm
 * renders a plain `<a>`. For the app's router link, pass `render` per call
 * site (e.g. `render={<Link />}` with `next/link`); the element is cloned
 * with the resolved anchor props and the children.
 *
 * Static leaf components (Badge, Box, BreadcrumbLink, …) use this so they can
 * render in React Server Components; client components keep `Polymorphic`,
 * whose context read resolves the `<UIProvider>`-registered link without
 * call-site wiring.
 */

/** Props for `PolymorphicStatic`; the fallback arm excludes `href` and `render`. */
export type PolymorphicStaticProps<
	Fallback extends ElementType,
	Omitted extends PropertyKey = never,
> =
	| ({ href?: never; render?: never } & Omit<
			ComponentPropsWithoutRef<Fallback>,
			'className' | Omitted
	  >)
	| ({ href: string; render?: ReactElement<LinkProps> } & Omit<LinkProps, 'className' | Omitted>)

/**
 * Renders an `href`-driven element switch: with `href`, clones `render` (the
 * call-site router link) with the resolved anchor props or falls back to a
 * plain `<a>`; without `href`, renders the `as` element. Forwards `ref`,
 * `data-slot`, `className`, and remaining props to the chosen element.
 *
 * @typeParam Fallback - Element type rendered when no `href` is given; its
 *   props type constrains the fallback arm.
 * @remarks
 * Server-safe counterpart of {@link Polymorphic}: it reads no LinkContext, so
 * the router link must be supplied per call site via `render`. Suits static
 * leaf components that render in React Server Components.
 *
 * @see {@link Polymorphic}
 */
export function PolymorphicStatic<Fallback extends ElementType>({
	as,
	href,
	render,
	ref,
	'data-slot': slot,
	className,
	children,
	...rest
}: {
	as: Fallback
	href?: string
	render?: ReactElement<LinkProps>
	ref?: Ref<Element>
	'data-slot': string
	className: string
	children: ReactNode
} & (
	| Omit<ComponentPropsWithoutRef<Fallback>, 'href' | 'ref' | 'className' | 'children'>
	| Omit<LinkProps, 'href' | 'ref' | 'className' | 'children'>
)) {
	if (href !== undefined) {
		const linkProps = {
			ref: ref as Ref<HTMLAnchorElement>,
			'data-slot': slot,
			href,
			className,
			...(rest as Omit<LinkProps, 'href' | 'className'>),
		}

		if (render) {
			return cloneElement(render, linkProps, children)
		}

		return <a {...linkProps}>{children}</a>
	}

	// `as as ElementType` widens a union of string tags to `ElementType`;
	// the narrow union collapses `{...rest}` to the `never` intersection of
	// every branch. Unrelated to the generic.
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
