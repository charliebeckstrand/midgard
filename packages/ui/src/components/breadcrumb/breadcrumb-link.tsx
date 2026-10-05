import { cn } from '../../core'
import { PolymorphicStatic, type PolymorphicStaticProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/breadcrumb'

/** Props for {@link BreadcrumbLink}: the `current` flag plus the polymorphic `span`/anchor surface. */
export type BreadcrumbLinkProps = {
	/**
	 * Marks this crumb as the current page (`aria-current="page"`).
	 * @defaultValue false
	 */
	current?: boolean
	className?: string
} & PolymorphicStaticProps<'span'>

/**
 * A breadcrumb crumb: a link when `href` is set, otherwise a `<span>`. Either
 * form carries `aria-current="page"` when `current`; the APG keeps the
 * current crumb a link too. Only the link form darkens on hover. Static leaf:
 * renders in React Server Components.
 * `href` renders a plain anchor; pass `render` (e.g. `render={<Link />}`) to
 * compose the app router link at the call site. Breadcrumb supplies its own
 * `k.link` styling. In a collapsing `Breadcrumb`, the crumb shows its label or
 * a `…` mark in its place, as the fit of the trail says.
 */
export function BreadcrumbLink({
	current = false,
	className,
	href,
	render,
	children,
	'aria-current': ariaCurrent,
	...props
}: BreadcrumbLinkProps) {
	return (
		<PolymorphicStatic
			as="span"
			href={href}
			render={render}
			data-slot="breadcrumb-link"
			className={cn(k.link({ current, interactive: href !== undefined }), k.crumb(), className)}
			{...props}
			// After the spread: `current` owns the state. A consumer value holds
			// only while the crumb is not current.
			aria-current={current ? 'page' : ariaCurrent}
		>
			{/* The label and the mark carry no padding, so the fit of a collapsing trail
			    reads their widths as they are. The label stays in the tree when its crumb
			    collapses, so the crumb still announces where it goes; the mark is drawn
			    from CSS and says nothing. Outside a collapsing trail the mark is not
			    displayed and the label is a plain span. */}
			<span data-slot="breadcrumb-label" className={k.label()}>
				{children}
			</span>

			<span data-slot="breadcrumb-mark" aria-hidden="true" className={k.mark()} />
		</PolymorphicStatic>
	)
}
