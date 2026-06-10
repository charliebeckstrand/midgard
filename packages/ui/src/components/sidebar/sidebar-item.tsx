'use client'

import { Children, isValidElement, type ReactNode, type Ref } from 'react'
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
import { SidebarItemActions } from './sidebar-item-actions'
import { SidebarLabel } from './sidebar-label'

export type SidebarItemProps = NavItemProps & {
	/** Size step. Resolves through `explicit ?? Density ?? 'md'`. */
	size?: Step
}

function isActionsElement(child: ReactNode) {
	return isValidElement(child) && child.type === SidebarItemActions
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

	// Resolved by the Sidebar root: true only when mini on a desktop viewport,
	// so the mobile drawer keeps plain items.
	const mini = useSidebarMini()

	// The row owns the chrome; the inner button holds only navigational
	// content. SidebarItemActions children hoist out of the button to the row,
	// where they can host their own interactive elements (nested buttons are
	// invalid HTML), matching the prefix/suffix slots.
	const childArray = Children.toArray(children)

	const actions = childArray.filter(isActionsElement)

	const content = childArray.filter((child) => !isActionsElement(child))

	// The tooltip surface portals out of the nav, where the rail's
	// group-scoped hiding can't reach, so anything echoed into it (affix
	// helpers) would render. Surface only the SidebarLabel children; items
	// composed without one fall back to their non-action content.
	const labels = content.filter((child) => isValidElement(child) && child.type === SidebarLabel)

	const inner = (
		<Button
			data-slot="sidebar-item-inner"
			data-current={item.current || undefined}
			aria-current={item.current ? 'page' : undefined}
			className={cn(k.item.inner({ size: item.size }))}
			onClick={item.handleClick}
			{...props}
		>
			<TouchTarget>
				{icon && <Icon icon={icon} size={item.size} />}
				{content}
			</TouchTarget>
		</Button>
	)

	return (
		<Wrapper
			ref={item.ref as Ref<HTMLLIElement & HTMLSpanElement>}
			data-slot="sidebar-item"
			className={cn(k.item.base({ size: item.size }), 'list-none', className)}
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
						<TooltipContent>{labels.length > 0 ? labels : content}</TooltipContent>
					</Tooltip>
				) : (
					inner
				)}
			</Headless>
			{actions}
			{suffix != null && (
				<span data-slot="sidebar-item-suffix" className={cn(k.item.affix)}>
					{suffix}
				</span>
			)}
			{item.current && <ActiveIndicator ref={item.indicator.ref} />}
		</Wrapper>
	)
}
