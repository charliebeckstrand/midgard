import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'

export type SidebarItemActionsProps = ComponentPropsWithoutRef<'div'>

/**
 * Trailing action cluster for a SidebarItem. The item hoists it out of the
 * inner button to the row, so it can host interactive elements (icon buttons,
 * menus) as well as badges and kbd hints. Hidden on the mini rail.
 */
export function SidebarItemActions({ className, ...props }: SidebarItemActionsProps) {
	return (
		<div
			data-slot="sidebar-item-actions"
			className={cn(
				'relative z-10',
				'flex items-center gap-1',
				'shrink-0',
				k.mini.hidden,
				className,
			)}
			{...props}
		/>
	)
}
