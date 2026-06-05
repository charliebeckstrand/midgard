import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/sidebar'
import { Icon } from '../icon'
import { createNavItem, type NavItemProps } from '../nav/nav-item-utilities'

export type SidebarItemProps = NavItemProps & {
	/** Size step. Resolves through `explicit ?? Density ?? 'md'`. */
	size?: Step
}

export const SidebarItem = createNavItem({
	slotPrefix: 'sidebar',
	variants: k.item.base,
	affix: cn(k.item.affix),
	renderIcon: (icon, size) => <Icon icon={icon} size={size} />,
})
