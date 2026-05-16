import { sidebarItemVariants } from '../../recipes/kata/sidebar'
import type { Step } from '../../recipes/ryu/sun'
import { Icon } from '../icon'
import { createNavItem, type NavItemProps } from '../nav/nav-item-helpers'

export type SidebarItemProps = NavItemProps & {
	/** Size step. Resolves through `explicit ?? Density ?? 'md'`. */
	size?: Step
}

export { sidebarItemVariants }

export const SidebarItem = createNavItem({
	slotPrefix: 'sidebar',
	variants: sidebarItemVariants,
	renderIcon: (icon, size) => <Icon icon={icon} size={size} />,
})
