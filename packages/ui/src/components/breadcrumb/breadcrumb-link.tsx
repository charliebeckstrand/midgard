import { cn } from '../../core'
import { PolymorphicStatic, type PolymorphicStaticProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/breadcrumb'

export type BreadcrumbLinkProps = {
	current?: boolean
	className?: string
} & PolymorphicStaticProps<'span'>

/**
 * A breadcrumb crumb: a link when `href` is set, otherwise a `<span>`. Either
 * form carries `aria-current="page"` when `current`; the APG keeps the
 * current crumb a link too. Static leaf: renders in React Server Components.
 * `href` renders a plain anchor; pass `render` (e.g. `render={<Link />}`) to
 * compose the app router link at the call site. Breadcrumb supplies its own
 * `k.link` styling.
 */
export function BreadcrumbLink({
	current = false,
	className,
	href,
	render,
	children,
	...props
}: BreadcrumbLinkProps) {
	return (
		<PolymorphicStatic
			as="span"
			href={href}
			render={render}
			data-slot="breadcrumb-link"
			aria-current={current ? 'page' : undefined}
			className={cn(k.link({ current }), className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
