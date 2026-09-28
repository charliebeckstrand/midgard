import type { ComponentProps, ElementType, ReactElement, Ref } from 'react'
import { Density } from '../density'
import type { LinkProps } from '../link'
import { resolveLinkRel } from '../link/link-rel'
import { mergeRenderProps } from './polymorphic-render-props'
import type { PolymorphicRenderProps } from './types'

/**
 * Server-safe sibling of `Polymorphic`: the same `href`-driven link switch
 * with element polymorphism, minus the LinkContext read. The `href` arm
 * renders a plain `<a>`. For the app's router link, pass `render` per call
 * site (e.g. `render={<Link />}` with `next/link`); the element is cloned
 * with the resolved anchor props and the children.
 *
 * Static leaf components (Badge, Box, BreadcrumbLink, …) use this so they can
 * render in React Server Components. Client components keep `Polymorphic`,
 * whose context read resolves the `<UIProvider>`-registered link without
 * call-site wiring.
 */

/** Props for `PolymorphicStatic`; the fallback arm excludes `href` and `render`. */
export type PolymorphicStaticProps<
	Fallback extends ElementType,
	Omitted extends PropertyKey = never,
> =
	| ({ href?: never; render?: never } & Omit<ComponentProps<Fallback>, 'className' | Omitted>)
	| ({ href: string; render?: ReactElement<LinkProps> } & Omit<LinkProps, 'className' | Omitted>)

/**
 * Renders an `href`-driven element switch. With `href`, it clones `render` (the
 * call-site router link) with the resolved anchor props, or falls back to a
 * plain `<a>`. Without `href`, it renders the `as` element. Forwards `ref`,
 * `data-slot`, `className`, and remaining props to the chosen element.
 *
 * @typeParam Fallback - Element type rendered when no `href` is given; its
 *   props type constrains the fallback arm.
 * @remarks
 * Server-safe counterpart of {@link Polymorphic}: it reads no LinkContext, so
 * the router link must be supplied per call site via `render`. Suits static
 * leaf components that render in React Server Components.
 *
 * The props of the `render` element merge with the resolved props. The
 * classes join, both event handlers run, and a resolved value wins on each
 * other key. The call-site `ref` wins over the `ref` of the `render` element,
 * and the `render` ref stays when the call site gives no `ref`. A link with
 * `target="_blank"` and no `rel` gets `rel="noopener noreferrer"`.
 *
 * A `density` step makes the element a density scope. It writes
 * `data-density` and opens the density context around the children. Static
 * and client descendants then take the same step.
 *
 * It is also the one render path of {@link Polymorphic}, which passes the
 * registered link as `render`.
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
	density,
	children: content,
	...rest
}: PolymorphicRenderProps<Fallback> & { render?: ReactElement<LinkProps> }) {
	// Only a scope renders the client context, so an element with no step adds
	// no client boundary to a server tree.
	const children = density ? <Density step={density}>{content}</Density> : content

	if (href !== undefined) {
		const linkProps = {
			'data-slot': slot,
			'data-density': density,
			href,
			className,
			...(rest as Omit<LinkProps, 'href' | 'className'>),
		}

		if (render) {
			// The clone renders the link's type through JSX, not through
			// `cloneElement`, and keeps each ref out of the merge call. The React
			// Compiler rejects a ref passed to a function during render.
			const Link = render.type

			const { ref: renderRef, ...renderProps } = render.props as LinkProps

			const merged = mergeRenderProps(renderProps, linkProps) as LinkProps

			return (
				<Link
					key={render.key}
					{...merged}
					ref={(ref as Ref<HTMLAnchorElement> | undefined) ?? renderRef}
					rel={resolveLinkRel(merged.target, merged.rel)}
				>
					{children}
				</Link>
			)
		}

		return (
			<a
				{...linkProps}
				ref={ref as Ref<HTMLAnchorElement> | undefined}
				rel={resolveLinkRel(linkProps.target, linkProps.rel)}
			>
				{children}
			</a>
		)
	}

	// `as as ElementType` widens a union of string tags to `ElementType`; the
	// narrow union collapses `{...rest}` to the `never` intersection of every
	// branch. Unrelated to the generic.
	const Element = as as ElementType

	return (
		<Element
			ref={ref}
			data-slot={slot}
			data-density={density}
			type={as === 'button' ? 'button' : undefined}
			className={className}
			{...(rest as ComponentProps<Fallback>)}
		>
			{children}
		</Element>
	)
}
