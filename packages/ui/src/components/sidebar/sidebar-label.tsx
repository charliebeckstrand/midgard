import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'

export type SidebarLabelProps = ComponentPropsWithoutRef<'span'>

export function SidebarLabel({ className, ...props }: SidebarLabelProps) {
	return <span data-slot="sidebar-label" className={cn(k.label, className)} {...props} />
}
