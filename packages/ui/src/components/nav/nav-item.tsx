'use client'

import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { TouchTarget } from '../../primitives/touch-target'
import { k } from '../../recipes/kata/nav'
import { Button } from '../button'
import { Headless } from '../headless'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from './use-nav-item'

/**
 * Props for `<NavItem>` — a navigation link/button. Extends the canonical
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

	// Affixes render as siblings of the inner button — never nested inside it —
	// so a slot can host its own interactive element without producing invalid
	// nested-interactive markup. The row only goes flex when an affix exists,
	// leaving the affix-less DOM and layout untouched.
	const hasAffix = prefix != null || suffix != null

	return (
		<span
			ref={item.ref}
			data-slot="nav-item"
			className={cn('group relative', hasAffix && 'flex items-center gap-1')}
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
					className={cn(k.item.base, 'relative z-10', hasAffix && 'min-w-0 flex-1', className)}
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
		</span>
	)
}
