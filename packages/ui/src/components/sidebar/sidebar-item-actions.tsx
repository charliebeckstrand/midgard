import type { ComponentProps } from 'react'
import { cn } from '../../core'

/** Props for {@link SidebarItemActions} (`<div>` attributes). */
export type SidebarItemActionsProps = ComponentProps<'div'>

/**
 * Trailing controls for a `SidebarItem`. Hoisted into the item's `suffix` slot,
 * so its contents render beside the row's button. Nested inside the `<button>`,
 * an interactive control would break markup. Beside the button they sit inside
 * the shared hover tint and focus ring, and join the cross-axis roving model. Equivalent to passing the same content to the `suffix` prop;
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
