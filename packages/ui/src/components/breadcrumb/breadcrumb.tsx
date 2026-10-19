import type { ComponentProps } from 'react'
import { BreadcrumbFit } from './breadcrumb-fit'
import { BreadcrumbNav } from './breadcrumb-nav'

/** Props for {@link Breadcrumb}; the `collapse` flag plus the underlying `<nav>` attributes. */
export type BreadcrumbProps = {
	/**
	 * Keeps the trail on one line. When the row cannot hold it, the crumbs give
	 * way from the left, each one whole to a `…` mark that the reader can still
	 * pick, and the current page clips at the end of the row only after every
	 * crumb above it has gone. Without it, the trail wraps.
	 *
	 * The fit is measured, and the first paint already holds it: a
	 * server-rendered trail carries a pre-paint step that measures the row before
	 * the browser paints it.
	 *
	 * The `<nav>` becomes a flex row that is the room of the fit, so give it the
	 * full width of its line. Anything that shares the line, such as an action on
	 * the current page, goes in the `<nav>` after the `<BreadcrumbList>`: the
	 * crumbs give way before it does.
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
export function Breadcrumb({ collapse = false, ...props }: BreadcrumbProps) {
	if (collapse) return <BreadcrumbFit {...props} />

	return <BreadcrumbNav {...props} />
}
