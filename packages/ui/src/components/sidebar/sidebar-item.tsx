'use client'

import { type ReactNode, type Ref, useEffect } from 'react'
import { cn, dataAttr } from '../../core'
import type { DensityStep } from '../../core/density'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { TouchTarget } from '../../primitives/touch-target'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/sidebar'
import { partitionByType } from '../../utilities/flatten-children'
import { Button } from '../button'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from '../nav/use-nav-item'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { useInSidebarList, useSidebarMini } from './context'
import { SidebarItemActions } from './sidebar-item-actions'
import { SidebarLabel } from './sidebar-label'

/** Props for {@link SidebarItem}: the `NavItem` surface plus a `size` step. */
export type SidebarItemProps = NavItemProps & {
	/**
	 * Size step of the row. It opens a density scope on the row, so the icon
	 * and the slots take the same step. Without it, the row takes the step of
	 * the nearest density scope.
	 */
	size?: DensityStep
}

/**
 * Partitions a `SidebarItem`'s children. A `SidebarItemActions` child hoists
 * into the `suffix` slot, and drops out of the inner content. It renders beside
 * the button rather than nested inside it, where an interactive control would
 * break markup. An explicit `suffix` prop wins. With both present, the
 * actions child renders nowhere, and `dropped` reports it. The mini-rail tooltip
 * (portaled past the rail's group-scoped hiding) carries only the
 * `SidebarLabel` children, falling back to the inner content when composed
 * without one.
 *
 * @internal
 */
function resolveItemChildren(children: ReactNode, suffix: ReactNode) {
	const { matched: actionsList, rest } = partitionByType(children, SidebarItemActions)

	const actions = actionsList[0]

	const inner = actions ? rest : children

	const labels = partitionByType(children, SidebarLabel).matched

	return {
		suffix: suffix ?? actions,
		inner,
		tooltip: labels.length > 0 ? labels : inner,
		dropped: suffix != null && actions !== undefined,
	}
}

/**
 * Navigation row inside a `Sidebar`, rendering as a `Button` (or `Link` when
 * `href` is set) marked `aria-current="page"` while `current`. Wraps in an
 * `<li>` inside a `SidebarList`, else a `<span>`. A `prefix`/`suffix` affix
 * flips the row to a flex layout. Its slots join the cross-axis roving model,
 * and sit inside the shared hover tint and focus ring. A `SidebarItemActions`
 * child hoists into the `suffix` slot. An explicit `suffix` prop wins, and the
 * actions child then renders nowhere; development builds warn. Under
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
	} = useNavItem({ current, preventClose, onClick })

	// Inside a SidebarList the wrapper is an <li>; standalone it is a <span>.
	const inList = useInSidebarList()

	const Wrapper = inList ? 'li' : 'span'

	// A SidebarItemActions child hoists into the suffix slot, the rest renders
	// inside the button, and the mini-rail tooltip surfaces only the labels.
	const {
		suffix: resolvedSuffix,
		inner: innerChildren,
		tooltip,
		dropped,
	} = resolveItemChildren(children, suffix)

	// An explicit suffix takes the slot, so the actions child renders nowhere.
	// The controls then vanish with no signal, so warn in development.
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!dropped) return

		console.warn(
			'SidebarItem: an explicit `suffix` wins the slot, so the `SidebarItemActions` child does not render. Pass one of the two.',
		)
	}, [dropped])

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
			aria-current={isCurrent ? 'page' : undefined}
		>
			<TouchTarget>
				{icon && <Icon icon={icon} />}
				{innerChildren}
			</TouchTarget>
		</Button>
	)

	return (
		<PolymorphicStatic
			as={Wrapper}
			ref={itemRef as Ref<HTMLLIElement & HTMLSpanElement>}
			data-slot="sidebar-item"
			density={size}
			className={k.item.row({ affix: hasAffix })}
			{...tapHandlers}
		>
			{prefix != null && (
				<span data-slot="sidebar-item-prefix" data-density="slot" className={cn(k.item.prefix)}>
					{prefix}
				</span>
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
			{resolvedSuffix != null && (
				<span data-slot="sidebar-item-suffix" data-density="slot" className={cn(k.item.suffix)}>
					{resolvedSuffix}
				</span>
			)}
			{isCurrent && (
				// A current affixed row re-draws its focus ring on the active indicator,
				// the topmost full-row surface; a plain row keeps the default.
				<ActiveIndicator ref={indicatorRef} className={cn(hasAffix && k.item.indicator)} />
			)}
		</PolymorphicStatic>
	)
}
