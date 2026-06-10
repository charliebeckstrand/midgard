'use client'

import { Children, isValidElement, type Ref } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { TouchTarget } from '../../primitives/touch-target'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/sidebar'
import { Button } from '../button'
import { Headless } from '../headless'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from '../nav/use-nav-item'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { useInSidebarList, useSidebarMini } from './context'
import { SidebarLabel } from './sidebar-label'

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

	// Inside a SidebarList the wrapper is an <li>; standalone it is a <span>.
	const inList = useInSidebarList()

	const Wrapper = inList ? 'li' : 'span'

	// Affixes render as siblings of the inner button, not nested inside it;
	// a slot can host its own interactive element. The row goes flex only when
	// an affix is present.
	const hasAffix = prefix != null || suffix != null

	// Resolved by the Sidebar root: true only when mini on a desktop viewport,
	// so the mobile drawer keeps plain items.
	const mini = useSidebarMini()

	// The tooltip surface portals out of the nav, where the rail's
	// group-scoped hiding can't reach, so anything echoed into it (actions,
	// affix helpers) would render. Surface only the SidebarLabel children;
	// items composed without one fall back to their full children.
	const labels = Children.toArray(children).filter(
		(child) => isValidElement(child) && child.type === SidebarLabel,
	)

	const inner = (
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
	)

	return (
		<Wrapper
			ref={item.ref as Ref<HTMLLIElement & HTMLSpanElement>}
			data-slot="sidebar-item"
			className={cn('group relative list-none', hasAffix && 'flex items-center')}
			{...(spring ? item.indicator.tapHandlers : {})}
		>
			{prefix != null && (
				<span data-slot="sidebar-item-prefix" className={cn(k.item.affix)}>
					{prefix}
				</span>
			)}
			<Headless>
				{mini ? (
					// The label renders twice: visually hidden inside the rail button
					// (keeping the accessible name) and as the tooltip surface.
					// `*:cursor-pointer` restores nav cursor over the trigger's
					// help-cursor default.
					<Tooltip placement="right" className="*:cursor-pointer">
						<TooltipTrigger>{inner}</TooltipTrigger>
						<TooltipContent>{labels.length > 0 ? labels : children}</TooltipContent>
					</Tooltip>
				) : (
					inner
				)}
			</Headless>
			{suffix != null && (
				<span data-slot="sidebar-item-suffix" className={cn(k.item.affix)}>
					{suffix}
				</span>
			)}
			{item.current && <ActiveIndicator ref={item.indicator.ref} />}
		</Wrapper>
	)
}
