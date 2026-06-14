import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'

/**
 * Props for {@link BreadcrumbItem}: the `current` styling flag (`@defaultValue false`) plus the underlying `<li>` attributes.
 *
 * @remarks `current` styles the item only; the `aria-current="page"` marker lives on the enclosed {@link BreadcrumbLink}.
 */
export type BreadcrumbItemProps = { current?: boolean } & ComponentPropsWithoutRef<'li'>

/**
 * A crumb list item (`<li>`). `current` drives styling only; `aria-current`
 * lives on the enclosed `<BreadcrumbLink>`, not the item. Static leaf: renders
 * in React Server Components.
 */
export function BreadcrumbItem({ current = false, className, ...props }: BreadcrumbItemProps) {
	// `current` drives styling only; `aria-current` lives on the crumb itself
	// (BreadcrumbLink), not the <li>.
	return (
		<li data-slot="breadcrumb-item" className={cn(k.item({ current }), className)} {...props} />
	)
}
