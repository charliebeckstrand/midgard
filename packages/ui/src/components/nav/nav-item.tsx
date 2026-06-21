'use client'

import type { Ref } from 'react'
import { cn, dataAttr } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { AffixContext, affixStepDown } from '../../primitives/affix'
import { TouchTarget } from '../../primitives/touch-target'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/nav'
import { Button } from '../button'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from './use-nav-item'

/**
 * Props for {@link NavItem}: the canonical {@link NavItemProps} plus `value` to
 * bind the item to the surrounding {@link Nav}'s selection state.
 */
export type NavMenuItemProps = NavItemProps & { value?: string }

/**
 * Navigation link/button within a {@link NavList}. Renders a polymorphic
 * {@link Button} as an `<li>`, marking itself `aria-current="page"` and mounting
 * the scope's active indicator when current (resolved from `current`, else the
 * `value` selection binding). Hosts `prefix`/`suffix` affix slots outside the
 * inner button and closes an enclosing offcanvas on click unless `preventClose`.
 *
 * @remarks
 * `aria-current="page"` marks the current link for assistive tech; the visual
 * active indicator animates between siblings within the enclosing
 * {@link NavList}'s active-indicator scope.
 *
 * @see {@link useNavItem} for the shared current-resolution and click wiring.
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
	// goes flex and takes over the interaction chrome (the `affix` slot on both
	// recipes), so the slots sit inside the hover tint and focus ring.
	const hasAffix = prefix != null || suffix != null

	return (
		<li
			ref={item.ref as Ref<HTMLLIElement>}
			data-slot="nav-item"
			className={k.navItem.base({ affix: hasAffix })}
			{...(spring ? item.indicator.tapHandlers : {})}
		>
			{prefix != null && (
				<span data-slot="nav-item-prefix" className={cn(k.navItem.prefix)}>
					{/* The item chrome is fixed at md, so slot controls step to sm. */}
					<AffixContext value={affixStepDown('md')}>{prefix}</AffixContext>
				</span>
			)}
			<HeadlessProvider>
				<Button
					data-slot="nav-item-inner"
					data-current={dataAttr(item.current)}
					aria-current={item.current ? 'page' : undefined}
					className={cn(k.navItem.button({ affix: hasAffix }), className)}
					onClick={item.handleClick}
					{...props}
				>
					<TouchTarget>
						{icon && <Icon icon={icon} />}
						{children}
					</TouchTarget>
				</Button>
			</HeadlessProvider>
			{suffix != null && (
				<span data-slot="nav-item-suffix" className={cn(k.navItem.suffix)}>
					<AffixContext value={affixStepDown('md')}>{suffix}</AffixContext>
				</span>
			)}
			{item.current && (
				<ActiveIndicator
					ref={item.indicator.ref}
					className={hasAffix ? cn(k.navItem.indicator) : undefined}
				/>
			)}
		</li>
	)
}
