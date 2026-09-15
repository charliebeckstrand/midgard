'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'
import { SidebarListContext } from './context'

/** Props for {@link SidebarList} (`<ul>` attributes). */
export type SidebarListProps = ComponentProps<'ul'>

/**
 * Groups `SidebarItem`s into a real `<ul>`, so screen readers expose the set's
 * count and position. Keep non-item content in the surrounding
 * `SidebarSection`, outside the list — a section heading, or a divider. Pass
 * `aria-label` or `aria-labelledby` to name the list after that heading.
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
