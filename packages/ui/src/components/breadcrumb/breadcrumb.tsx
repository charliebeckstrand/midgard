import type { ComponentPropsWithoutRef } from 'react'

/** Props for {@link Breadcrumb}; the underlying `<nav>` attributes. */
export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

/**
 * Breadcrumb navigation landmark: renders a `<nav>` labelled
 * `aria-label="Breadcrumb"` (APG). Holds a `<BreadcrumbList>` of
 * `<BreadcrumbItem>`s, each wrapping a `<BreadcrumbLink>`, with
 * `<BreadcrumbSeparator>`s between crumbs. Static leaf: renders in React Server
 * Components. Compose `<BreadcrumbSkeleton>` for loading trees.
 */
export function Breadcrumb(props: BreadcrumbProps) {
	return <nav data-slot="breadcrumb" aria-label="Breadcrumb" {...props} />
}
