import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { BreadcrumbNav } from './breadcrumb-nav'
import { BREADCRUMB_ORDER_RULE } from './breadcrumb-order'

/** Props for {@link Breadcrumb}; the `collapse` flag plus the underlying `<nav>` attributes. */
export type BreadcrumbProps = {
	/**
	 * Keeps the trail on one line. When the row cannot hold it, the crumbs give
	 * way from the start of the trail, each one whole, to one `…` mark at the
	 * start of the row. The mark goes to the nearest crumb that gave way. The
	 * current page clips at the end of the row only after every crumb above it
	 * has gone. Each crumb stays in the tree, so a keyboard or a screen reader
	 * still reaches it. A crumb that gave way draws its focus ring on the mark.
	 * Without `collapse`, the trail wraps.
	 *
	 * CSS makes the fit, with no measure. Thus the server paints the fit, and
	 * hydration does not change it.
	 *
	 * The `<nav>` becomes a flex row that is the room of the fit, so give it the
	 * full width of its line. Anything that shares the line, such as an action on
	 * the current page, goes in the `<nav>` after the `<BreadcrumbList>`: the
	 * crumbs give way before it does. The fit places sixteen crumbs. Use the
	 * default separator, because the fit keeps the room of that separator.
	 *
	 * @defaultValue false
	 */
	collapse?: boolean
} & ComponentProps<'nav'>

/**
 * Breadcrumb navigation landmark: renders a `<nav>` named "Breadcrumb" in the
 * language of the reader (APG). Holds a `<BreadcrumbList>` of
 * `<BreadcrumbItem>`s, each wrapping a `<BreadcrumbLink>`, with
 * `<BreadcrumbSeparator>`s between crumbs. Set `collapse` to keep a long trail
 * on one line. Static leaf: renders in React Server Components. The `<nav>`
 * is its client part, which reads the name from the nearest `LocaleProvider`.
 * Pass `aria-label` to give the trail another name. Compose
 * `<BreadcrumbSkeleton>` for loading trees.
 */
export function Breadcrumb({ collapse = false, className, ...props }: BreadcrumbProps) {
	if (!collapse) return <BreadcrumbNav className={className} {...props} />

	return (
		<>
			<style>{BREADCRUMB_ORDER_RULE}</style>

			<BreadcrumbNav
				// What follows the list keeps its width: the crumbs give way first.
				className={cn(
					'flex min-w-0 items-center [&>:not([data-slot=breadcrumb-list])]:shrink-0',
					className,
				)}
				{...props}
				// After the spread: the kata and the order rule select on it.
				data-collapse=""
			/>
		</>
	)
}
