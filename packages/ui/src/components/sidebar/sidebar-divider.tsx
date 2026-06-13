import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'

export type SidebarDividerProps = ComponentPropsWithoutRef<'hr'>

/** Horizontal rule separating groups of items within a `Sidebar`. */
export function SidebarDivider({ className, ...props }: SidebarDividerProps) {
	return <hr data-slot="sidebar-divider" className={cn(k.divider, className)} {...props} />
}
