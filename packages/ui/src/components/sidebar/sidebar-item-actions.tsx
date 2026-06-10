import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/sidebar'

export type SidebarItemActionsProps = ComponentPropsWithoutRef<'div'>

/**
 * Trailing decoration slot for a SidebarItem (badges, kbd hints). Renders
 * inside the item's button, so children must be non-interactive; interactive
 * elements belong in the item's `prefix`/`suffix` slots, which render outside
 * the button. Hidden on the mini rail.
 */
export function SidebarItemActions({ className, ...props }: SidebarItemActionsProps) {
	return (
		<div
			data-slot="sidebar-item-actions"
			className={cn('flex items-center gap-1', k.mini.hidden, className)}
			{...props}
		/>
	)
}
