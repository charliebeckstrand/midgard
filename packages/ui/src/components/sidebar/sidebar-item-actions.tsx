import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'

export type SidebarItemActionsProps = ComponentPropsWithoutRef<'div'>

/** Trailing controls inside a `SidebarItem` row; hidden when the parent collapses to the mini rail. */
export function SidebarItemActions({ className, ...props }: SidebarItemActionsProps) {
	return (
		<div
			data-slot="sidebar-item-actions"
			className={cn('flex items-center gap-1', k.mini.hidden, className)}
			{...props}
		/>
	)
}
