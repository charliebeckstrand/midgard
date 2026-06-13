'use client'

import type { Ref } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { AffixContext, affixStepDown } from '../../primitives/affix'
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

/**
 * Navigation link/button within a {@link NavList}. Renders a polymorphic
 * {@link Button} as a list item, marking itself `aria-current="page"` and
 * mounting the scope's active indicator when current (resolved from `current`
 * or selection binding via `value`). Hosts `prefix`/`suffix` affix slots
 * outside the inner button and closes an enclosing offcanvas on click unless
 * `preventClose`.
 */
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

	// Affixes render as siblings of the inner button, not nested inside it; a
	// slot can host its own interactive element. With an affix present the row
	// goes flex and takes over the interaction chrome (`k.item.row` + `bare`),
	// so the slots sit inside the hover tint and focus ring.
	const hasAffix = prefix != null || suffix != null

	return (
		<li
			ref={item.ref as Ref<HTMLLIElement>}
			data-slot="nav-item"
			className={cn(
				'group relative list-none',
				hasAffix && ['flex items-center gap-1', k.item.row],
			)}
			{...(spring ? item.indicator.tapHandlers : {})}
		>
			{prefix != null && (
				<span data-slot="nav-item-prefix" className={cn(k.item.prefix)}>
					{/* The item chrome is fixed at md, so slot controls step to sm. */}
					<AffixContext value={affixStepDown('md')}>{prefix}</AffixContext>
				</span>
			)}
			<Headless>
				<Button
					data-slot="nav-item-inner"
					data-current={item.current || undefined}
					aria-current={item.current ? 'page' : undefined}
					className={cn(
						hasAffix ? k.item.bare : k.item.base,
						'relative z-10',
						hasAffix && 'min-w-0 flex-1',
						className,
					)}
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
				<span data-slot="nav-item-suffix" className={cn(k.item.suffix)}>
					<AffixContext value={affixStepDown('md')}>{suffix}</AffixContext>
				</span>
			)}
			{item.current && (
				<ActiveIndicator
					ref={item.indicator.ref}
					className={hasAffix ? cn(k.item.indicator) : undefined}
				/>
			)}
		</li>
	)
}
