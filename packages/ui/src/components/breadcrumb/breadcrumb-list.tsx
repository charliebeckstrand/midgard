import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'

/** Props for {@link BreadcrumbList}; the underlying `<ol>` attributes. */
export type BreadcrumbListProps = ComponentPropsWithoutRef<'ol'>

/**
 * Ordered list (`<ol>`) holding the crumbs and separators of a `<Breadcrumb>`.
 * Static leaf: renders in React Server Components.
 */
export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
	return <ol data-slot="breadcrumb-list" className={cn(k.list(), className)} {...props} />
}
