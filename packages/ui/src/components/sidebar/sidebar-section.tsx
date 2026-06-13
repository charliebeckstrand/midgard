import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'

export type SidebarSectionProps = ComponentPropsWithoutRef<'div'>

/** Groups related sidebar content (a heading, a `SidebarList`, a divider) into one block. */
export function SidebarSection({ className, ...props }: SidebarSectionProps) {
	return <div data-slot="sidebar-section" className={cn(k.section, className)} {...props} />
}
