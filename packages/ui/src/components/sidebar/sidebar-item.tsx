'use client'

import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { TouchTarget } from '../../primitives/touch-target'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/sidebar'
import { Button } from '../button'
import { Headless } from '../headless'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from '../nav/use-nav-item'

export type SidebarItemProps = NavItemProps & {
	/** Size step. Resolves through `explicit ?? Density ?? 'md'`. */
	size?: Step
}

export function SidebarItem({
	icon,
	current,
	size,
	className,
	children,
	preventClose,
	spring = false,
	prefix,
	suffix,
	onClick,
	...props
}: SidebarItemProps) {
	const item = useNavItem({ current, size, preventClose, onClick })

	// Affixes render as siblings of the inner button — never nested inside it —
	// so a slot can host its own interactive element without producing invalid
	// nested-interactive markup. The row only goes flex when an affix exists,
	// leaving the affix-less DOM and layout untouched.
	const hasAffix = prefix != null || suffix != null

	return (
		<span
			ref={item.ref}
			data-slot="sidebar-item"
			className={cn('group relative', hasAffix && 'flex items-center gap-1')}
			{...(spring ? item.indicator.tapHandlers : {})}
		>
			{prefix != null && (
				<span data-slot="sidebar-item-prefix" className={cn(k.item.affix)}>
					{prefix}
				</span>
			)}
			<Headless>
				<Button
					data-slot="sidebar-item-inner"
					data-current={item.current || undefined}
					aria-current={item.current ? 'page' : undefined}
					className={cn(
						k.item.base({ size: item.size }),
						'relative z-10',
						hasAffix && 'min-w-0 flex-1',
						className,
					)}
					onClick={item.handleClick}
					{...props}
				>
					<TouchTarget>
						{icon && <Icon icon={icon} size={item.size} />}
						{children}
					</TouchTarget>
				</Button>
			</Headless>
			{suffix != null && (
				<span data-slot="sidebar-item-suffix" className={cn(k.item.affix)}>
					{suffix}
				</span>
			)}
			{item.current && <ActiveIndicator ref={item.indicator.ref} />}
		</span>
	)
}
