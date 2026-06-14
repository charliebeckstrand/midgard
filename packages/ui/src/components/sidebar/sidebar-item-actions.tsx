import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'

export type SidebarItemActionsProps = ComponentPropsWithoutRef<'div'>

/**
 * Trailing controls for a `SidebarItem`. Hoisted into the item's `suffix`
 * slot, so its contents render beside the row's button — inside the shared
 * hover tint and focus ring, joining the cross-axis roving model — rather
 * than nested inside the `<button>`, where an interactive control would
 * break markup. Equivalent to passing the same content to the `suffix` prop;
 * an explicit `suffix` wins. The suffix slot hides it on the mini rail.
 *
 * @see {@link SidebarItem}
 */
export function SidebarItemActions({ className, ...props }: SidebarItemActionsProps) {
	return (
		<div
			data-slot="sidebar-item-actions"
			className={cn('flex items-center gap-1', className)}
			{...props}
		/>
	)
}
