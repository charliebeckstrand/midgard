'use client'

import type { MouseEvent } from 'react'
import { cn } from '../../core'
import { useCurrent } from '../../primitives'
import { k } from '../../recipes/kata/nav'
import { Icon } from '../icon'
import { createNavItem, type NavItemProps } from './nav-item-helpers'

const BaseNavItem = createNavItem({
	slotPrefix: 'nav',
	variants: () => cn(k.item),
	renderIcon: (icon) => <Icon icon={icon} />,
})

/**
 * Props for `<NavItem>` — the Nav family's `role="menuitem"` variant. Extends
 * the canonical `NavItemProps` with `value` for binding to the surrounding
 * `<Nav>`'s selection state.
 */
export type NavMenuItemProps = NavItemProps & { value?: string }

export function NavItem({ value, current, onClick, ...props }: NavMenuItemProps) {
	const ctx = useCurrent()

	const isCurrent = current ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: MouseEvent<HTMLElement>) {
		onClick?.(e as MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return <BaseNavItem role="menuitem" current={isCurrent} onClick={handleClick} {...props} />
}
