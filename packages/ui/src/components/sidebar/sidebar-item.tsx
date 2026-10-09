'use client'

import type { Ref } from 'react'
import { cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { TouchTarget } from '../../primitives/touch-target'
import { HeadlessProvider } from '../../providers/headless'
import { k, type scale } from '../../recipes/kata/sidebar'
import { partitionByType } from '../../utilities/flatten-children'
import { Button } from '../button'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from '../nav/use-nav-item'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { useInSidebarList, useSidebarMini } from './context'
import { SidebarLabel } from './sidebar-label'

/** Props for {@link SidebarItem}: the `NavItem` surface plus a `size` step. */
export type SidebarItemProps = NavItemProps & {
	/**
	 * The density step of the row: `xs` to `xl`. Omit it to take the step of the
	 * nearest density scope. A step makes the row a density scope, so the icon
	 * and the slots take the step too.
	 */
	size?: ScaleStep<typeof scale>
}

/**
 * Navigation row inside a `Sidebar`, rendering as a `Button` (or `Link` when
 * `href` is set) marked `aria-current` while `current`: `"page"` on a link, and
 * `"true"` on a button, which switches a view in the page. Without `current`, a
 * link is current when its `href` matches the `pathname` of `UIProvider` (see
 * `match`). Wraps in an
 * `<li>` inside a `SidebarList`, else a `<div>`. A `prefix`/`suffix` affix
 * flips the row to a flex layout. Its slots join the cross-axis roving model,
 * and sit inside the shared hover tint and focus ring. Trailing controls go in
 * `suffix`, beside the button, because an interactive control inside the
 * `<button>` breaks markup. Under the parent's mini rail the label is hidden in
 * place (preserving the accessible name) and echoed into a hover tooltip. The
 * tooltip holds only the `SidebarLabel` children, or all the children when the
 * row has no label.
 */
export function SidebarItem({
	icon,
	current,
	match,
	size,
	className,
	children,
	preventClose,
	prefix,
	suffix,
	onClick,
	...props
}: SidebarItemProps) {
	const {
		ref: itemRef,
		current: isCurrent,
		indicator: { ref: indicatorRef, tapHandlers },
		handleClick,
	} = useNavItem({ current, href: props.href, match, preventClose, onClick })

	// Inside a SidebarList the wrapper is an <li>; standalone it is a <div>. The
	// wrapper holds the affix slots, which can hold flow content.
	const inList = useInSidebarList()

	const Wrapper = inList ? 'li' : 'div'

	// The mini-rail tooltip (portaled past the rail's group-scoped hiding)
	// surfaces only the labels.
	const labels = partitionByType(children, SidebarLabel).matched

	const tooltip = labels.length > 0 ? labels : children

	// Affixes render as siblings of the inner button, not nested inside it;
	// a slot can host its own interactive element. With an affix present the
	// row goes flex and takes over the interaction chrome (`chrome: 'row'`),
	// so the slots sit inside the hover tint and focus ring.
	const hasAffix = prefix != null || suffix != null

	// Resolved by the Sidebar root: true only when mini on a desktop viewport,
	// so the mobile drawer keeps plain items.
	const mini = useSidebarMini()

	const inner = (
		<Button
			data-current={dataAttr(isCurrent)}
			className={cn(
				k.item.base({ chrome: hasAffix ? 'row' : 'item' }),
				// In the mini rail this Button is the tooltip trigger; restore the nav
				// cursor over the trigger's help-cursor default.
				mini && '*:cursor-pointer',
				className,
			)}
			onClick={handleClick}
			// Consumer props spread first; the type, the anchor the Sidebar's roving
			// selects on, and the current marker below take precedence.
			{...props}
			type="button"
			data-slot="sidebar-item-inner"
			aria-current={isCurrent ? (props.href ? 'page' : 'true') : undefined}
		>
			<TouchTarget>
				{icon && <Icon icon={icon} />}
				{children}
			</TouchTarget>
		</Button>
	)

	return (
		<PolymorphicStatic
			as={Wrapper}
			ref={itemRef as Ref<HTMLLIElement & HTMLDivElement>}
			data-slot="sidebar-item"
			density={size}
			className={k.item.row({ affix: hasAffix })}
			{...tapHandlers}
		>
			{prefix != null && (
				<div data-slot="sidebar-item-prefix" data-density="slot" className={cn(k.item.prefix)}>
					{prefix}
				</div>
			)}
			<HeadlessProvider>
				{mini ? (
					// The label renders twice: visually hidden inside the rail button
					// (keeping the accessible name) and as the tooltip surface.
					<Tooltip placement="right">
						<TooltipTrigger>{inner}</TooltipTrigger>
						<TooltipContent>{tooltip}</TooltipContent>
					</Tooltip>
				) : (
					inner
				)}
			</HeadlessProvider>
			{suffix != null && (
				<div data-slot="sidebar-item-suffix" data-density="slot" className={cn(k.item.suffix)}>
					{suffix}
				</div>
			)}
			{isCurrent && (
				// A current affixed row re-draws its focus ring on the active indicator,
				// the topmost full-row surface; a plain row keeps the default.
				<ActiveIndicator ref={indicatorRef} className={cn(hasAffix && k.item.indicator)} />
			)}
		</PolymorphicStatic>
	)
}
