'use client'

import type { MouseEvent } from 'react'
import { cn } from '../../core'
import { useCurrent } from '../../primitives'
import { type NavItemProps as BaseNavItemProps, createNavItem } from '../../primitives/nav-item'
import { k } from '../../recipes/kata/nav'
import { Icon } from '../icon'

const BaseNavItem = createNavItem({
	slotPrefix: 'nav',
	variants: () => cn(k.item),
	renderIcon: (icon) => <Icon icon={icon} />,
})

export type NavItemProps = BaseNavItemProps & { value?: string }

export function NavItem({ value, current, onClick, ...props }: NavItemProps) {
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
