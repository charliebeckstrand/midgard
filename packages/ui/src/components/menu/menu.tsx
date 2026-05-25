'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { MenuActionsContext, MenuStateContext } from './context'
import { useMenuState } from './use-menu-state'

export type MenuProps = {
	defaultOpen?: boolean
	placement?: Placement
	/**
	 * Size step that drives menu item padding and text size.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

export function Menu({ defaultOpen, placement, size, className, children }: MenuProps) {
	const { state, actions, handleContextMenu, isDropdown } = useMenuState({
		defaultOpen,
		placement,
		size,
	})

	return (
		<MenuActionsContext value={actions}>
			<MenuStateContext value={state}>
				<div
					data-slot="menu"
					className={cn(className)}
					{...(!isDropdown && { role: 'application', onContextMenu: handleContextMenu })}
				>
					{children}
				</div>
			</MenuStateContext>
		</MenuActionsContext>
	)
}
