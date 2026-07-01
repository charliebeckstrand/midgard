'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { MenuActionsContext, MenuStateContext } from './context'
import { useMenuState } from './use-menu-state'

export type MenuProps = {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Preferred side/alignment of the dropdown panel relative to the trigger;
	 * flips on collision. Its presence is what selects dropdown mode: omit it and
	 * the wrapper instead opens as a right-click context menu (or, with
	 * `defaultOpen`, a static inline menu). Dropdowns fall back to `'bottom-start'`.
	 */
	placement?: Placement
	/**
	 * Size step that drives menu item padding and text size.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

/**
 * Composition root for menus; provides open state and actions to its trigger
 * and items via context. A `placement` makes it a floating dropdown; without
 * one the wrapper opens as a right-click context menu, or — when `defaultOpen`
 * is set — renders as a static inline menu.
 *
 * @see {@link MenuTrigger}
 * @see {@link MenuContent}
 * @see {@link useMenuState}
 */
export function Menu({
	open,
	defaultOpen,
	onOpenChange,
	placement,
	size,
	className,
	children,
}: MenuProps) {
	const { state, actions, handleContextMenu, isDropdown } = useMenuState({
		open,
		defaultOpen,
		onOpenChange,
		placement,
		size,
	})

	return (
		<MenuActionsContext value={actions}>
			<MenuStateContext value={state}>
				<div
					data-slot="menu"
					// contents: this wrapper must not participate in layout, or it
					// introduces a box between the trigger/content and whatever flex or
					// grid container the caller placed the menu in, breaking alignment.
					className={cn('contents', className)}
					// No role: the wrapper holds arbitrary page content and implements no
					// keyboard model of its own. Stamping role="application" here would
					// suppress AT browse-mode for everything inside it, so it is omitted.
					{...(!isDropdown && { onContextMenu: handleContextMenu })}
				>
					{children}
				</div>
			</MenuStateContext>
		</MenuActionsContext>
	)
}
