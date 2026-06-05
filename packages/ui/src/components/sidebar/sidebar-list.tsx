'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'
import { SidebarListContext } from './context'

export type SidebarListProps = ComponentPropsWithoutRef<'ul'>

/**
 * Groups `SidebarItem`s into a real `<ul>` so screen readers expose the set's
 * count and position. Keep non-item content (a section heading, a divider) in
 * the surrounding `SidebarSection`, outside the list; pass `aria-label` /
 * `aria-labelledby` to name the list after that heading.
 */
export function SidebarList({ className, children, ...props }: SidebarListProps) {
	return (
		<SidebarListContext value={true}>
			<ul data-slot="sidebar-list" className={cn(k.list, className)} {...props}>
				{children}
			</ul>
		</SidebarListContext>
	)
}
