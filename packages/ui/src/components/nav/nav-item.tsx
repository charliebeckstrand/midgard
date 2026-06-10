'use client'

import type { Ref } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { TouchTarget } from '../../primitives/touch-target'
import { k } from '../../recipes/kata/nav'
import { Button } from '../button'
import { Headless } from '../headless'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from './use-nav-item'

/**
 * Props for `<NavItem>`, a navigation link/button. Extends the canonical
 * `NavItemProps` with `value` for binding to the surrounding `<Nav>`'s
 * selection state.
 */
export type NavMenuItemProps = NavItemProps & { value?: string }

export function NavItem({
	icon,
	value,
	current,
	className,
	children,
	preventClose,
	spring = false,
	prefix,
	suffix,
	onClick,
	...props
}: NavMenuItemProps) {
	const item = useNavItem({ current, value, preventClose, onClick })

	// The row (<li>) owns the chrome; the inner button is a content strip
	// filling the remaining space. Affixes render as its siblings, so a slot
	// can host its own interactive element.
	return (
		<li
			ref={item.ref as Ref<HTMLLIElement>}
			data-slot="nav-item"
			className={cn(k.item.base, 'list-none', className)}
			{...(spring ? item.indicator.tapHandlers : {})}
		>
			{prefix != null && (
				<span data-slot="nav-item-prefix" className={cn(k.item.affix)}>
					{prefix}
				</span>
			)}
			<Headless>
				<Button
					data-slot="nav-item-inner"
					data-current={item.current || undefined}
					aria-current={item.current ? 'page' : undefined}
					className={cn(k.item.inner)}
					onClick={item.handleClick}
					{...props}
				>
					<TouchTarget>
						{icon && <Icon icon={icon} />}
						{children}
					</TouchTarget>
				</Button>
			</Headless>
			{suffix != null && (
				<span data-slot="nav-item-suffix" className={cn(k.item.affix)}>
					{suffix}
				</span>
			)}
			{item.current && <ActiveIndicator ref={item.indicator.ref} />}
		</li>
	)
}
