import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'

export type SidebarLabelProps = ComponentPropsWithoutRef<'span'>

/**
 * Text label of a `SidebarItem`. Under the mini rail it is hidden in place
 * (keeping the accessible name) and echoed into the item's hover tooltip.
 */
export function SidebarLabel({ className, ...props }: SidebarLabelProps) {
	return <span data-slot="sidebar-label" className={cn(k.label, className)} {...props} />
}
