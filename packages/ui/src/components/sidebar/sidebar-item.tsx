'use client'

import { Children, isValidElement, type ReactNode, type Ref } from 'react'
import { cn, dataAttr } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { AffixContext, affixStepDown } from '../../primitives/affix'
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

/**
 * Partitions a `SidebarItem`'s children. A `SidebarItemActions` child hoists
 * into the `suffix` slot — rendering beside the button rather than nested
 * inside it, where an interactive control would break markup — and drops out
 * of the inner content; an explicit `suffix` prop wins. The mini-rail tooltip
 * (portaled past the rail's group-scoped hiding) carries only the
 * `SidebarLabel` children, falling back to the inner content when composed
 * without one.
 *
 * @internal
 */
function resolveItemChildren(children: ReactNode, suffix: ReactNode) {
	const childArray = Children.toArray(children)

	const actions = childArray.find(
		(child) => isValidElement(child) && child.type === SidebarItemActions,
	)

	const inner = actions ? childArray.filter((child) => child !== actions) : children

	const labels = childArray.filter((child) => isValidElement(child) && child.type === SidebarLabel)

	return { suffix: suffix ?? actions, inner, tooltip: labels.length > 0 ? labels : inner }
}

/**
 * Navigation row inside a `Sidebar`, rendering as a `Button` (or `Link` when
 * `href` is set) marked `aria-current="page"` while `current`. Wraps in an
 * `<li>` inside a `SidebarList`, else a `<span>`. A `prefix`/`suffix` affix
 * flips the row to a flex layout whose slots join the cross-axis roving model
 * and sit inside the shared hover tint and focus ring; a `SidebarItemActions`
 * child hoists into the `suffix` slot (an explicit `suffix` prop wins). Under
 * the parent's mini rail the label is hidden in place (preserving the
 * accessible name) and echoed into a hover tooltip.
 *
 * @see {@link SidebarItemActions}
 */
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

	// A SidebarItemActions child hoists into the suffix slot, the rest renders
	// inside the button, and the mini-rail tooltip surfaces only the labels.
	const {
		suffix: resolvedSuffix,
		inner: innerChildren,
		tooltip,
	} = resolveItemChildren(children, suffix)

	// Affixes render as siblings of the inner button, not nested inside it;
	// a slot can host its own interactive element. With an affix present the
	// row goes flex and takes over the interaction chrome (`chrome: 'row'`),
	// so the slots sit inside the hover tint and focus ring.
	const hasAffix = prefix != null || resolvedSuffix != null

	// Resolved by the Sidebar root: true only when mini on a desktop viewport,
	// so the mobile drawer keeps plain items.
	const mini = useSidebarMini()

	const inner = (
		<Button
			data-slot="sidebar-item-inner"
			data-current={dataAttr(item.current)}
			aria-current={item.current ? 'page' : undefined}
			className={cn(k.item.base({ size: item.size, chrome: hasAffix ? 'row' : 'item' }), className)}
			onClick={item.handleClick}
			{...props}
		>
			<TouchTarget>
				{icon && <Icon icon={icon} size={item.size} />}
				{innerChildren}
			</TouchTarget>
		</Button>
	)

	return (
		<Wrapper
			ref={item.ref as Ref<HTMLLIElement & HTMLSpanElement>}
			data-slot="sidebar-item"
			className={k.item.row({ affix: hasAffix, size: item.size })}
			{...(spring ? item.indicator.tapHandlers : {})}
		>
			{prefix != null && (
				<span data-slot="sidebar-item-prefix" className={cn(k.item.prefix({ size: item.size }))}>
					<AffixContext value={affixStepDown(item.size)}>{prefix}</AffixContext>
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
						<TooltipContent>{tooltip}</TooltipContent>
					</Tooltip>
				) : (
					inner
				)}
			</Headless>
			{resolvedSuffix != null && (
				<span data-slot="sidebar-item-suffix" className={cn(k.item.suffix({ size: item.size }))}>
					<AffixContext value={affixStepDown(item.size)}>{resolvedSuffix}</AffixContext>
				</span>
			)}
			{item.current && (
				// A current affixed row re-draws its focus ring on the active indicator,
				// the topmost full-row surface; a plain row keeps the default.
				<ActiveIndicator ref={item.indicator.ref} className={cn(hasAffix && k.item.indicator)} />
			)}
		</Wrapper>
	)
}
