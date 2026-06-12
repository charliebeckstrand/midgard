import type { ComponentPropsWithoutRef } from 'react'

export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

/**
 * Container for a breadcrumb navigation. Renders a `<nav>` with `aria-label="Breadcrumb"`.
 * Compose `<BreadcrumbItem>` and `<BreadcrumbSeparator>` children.
 */
export function Breadcrumb(props: BreadcrumbProps) {
	return <nav data-slot="breadcrumb" aria-label="Breadcrumb" {...props} />
}
