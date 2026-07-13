import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'

/** Props for {@link BreadcrumbItem}: the underlying `<li>` attributes. */
export type BreadcrumbItemProps = ComponentPropsWithoutRef<'li'>

/**
 * A crumb list item (`<li>`). The current-page marker (`aria-current="page"`
 * and its styling) lives on the enclosed `<BreadcrumbLink>`, not the item.
 * Static leaf: renders in React Server Components.
 */
export function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
	return <li data-slot="breadcrumb-item" className={cn(k.item(), className)} {...props} />
}
