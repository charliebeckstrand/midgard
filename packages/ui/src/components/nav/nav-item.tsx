'use client'

import type { Ref } from 'react'
import { cn, dataAttr } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { TouchTarget } from '../../primitives/touch-target'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/nav'
import { Button } from '../button'
import { Icon } from '../icon'
import { type NavItemProps, useNavItem } from './use-nav-item'

/**
 * Removes `K` from each arm of the union `T`. A plain `Omit` on a union keeps
 * only the keys that each arm has.
 *
 * @internal
 */
type OmitEach<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/**
 * Props for {@link NavItem}: the canonical {@link NavItemProps} plus `value` to
 * bind the item to the surrounding {@link Nav}'s selection state.
 */
// The native `value` of the `<button>` is wider than the selection value, so
// each arm drops it before the selection `value` joins.
export type NavMenuItemProps = OmitEach<NavItemProps, 'value'> & { value?: string }

/**
 * Navigation link/button within a {@link NavList}. Renders a polymorphic
 * {@link Button} as an `<li>`, marking itself `aria-current` and mounting
 * the scope's active indicator when current. Current resolves from `current`,
 * else from the `value` selection binding, else from an `href` that matches the
 * `pathname` of `UIProvider` (see `match`). Hosts `prefix`/`suffix` affix slots outside the
 * inner button and closes an enclosing offcanvas on click unless `preventClose`.
 * A Ctrl, Meta, or Alt click on a link is for the browser, such as a new tab, so
 * the item does not change the selection or close the offcanvas.
 *
 * The height, the text, and the icon take the step of the nearest density
 * scope. At `md` the item is `p-2` with `text-base` and a `size-5` icon. Each
 * affix slot is a density scope one step below the item, so an Icon, a Badge,
 * or a Button in a slot steps down with no `size`.
 *
 * @remarks
 * `aria-current` marks the current item for assistive tech: `"page"` on a link
 * (`href`), and `"true"` on a button, which switches a view in the page. The visual
 * active indicator animates between siblings within the enclosing
 * {@link NavList}'s active-indicator scope.
 *
 * @see {@link useNavItem} for the shared current-resolution and click wiring.
 */
export function NavItem({
	icon,
	value,
	current,
	match,
	className,
	children,
	preventClose,
	prefix,
	suffix,
	onClick,
	...props
}: NavMenuItemProps) {
	const {
		ref: itemRef,
		current: isCurrent,
		ariaCurrent,
		indicator: { ref: indicatorRef, tapHandlers },
		handleClick,
	} = useNavItem({ current, value, href: props.href, match, preventClose, onClick })

	// Affixes render as siblings of the inner button, not nested inside it; a
	// slot can host its own interactive element. With an affix present the row
	// goes flex and takes over the interaction chrome (the `affix` axis of the
	// unit), so the slots sit inside the hover tint and focus ring.
	const hasAffix = prefix != null || suffix != null

	const slots = k.item({ affix: hasAffix })

	return (
		<li
			ref={itemRef as Ref<HTMLLIElement>}
			data-slot="nav-item"
			className={slots.base}
			{...tapHandlers}
		>
			{prefix != null && (
				// Each slot is a density scope one step below the item. A slot is a
				// `<div>`, so it can hold flow content.
				<div data-slot="nav-item-prefix" data-density="slot" className={slots.prefix}>
					{prefix}
				</div>
			)}
			<HeadlessProvider>
				<Button
					// Navigation writes no field, so a locked scope, such as a submitting
					// form, leaves it live.
					lockable={false}
					data-current={dataAttr(isCurrent)}
					className={cn(slots.button, className)}
					onClick={handleClick}
					// Consumer props spread first; the type, the anchor a kata
					// `has-[]` rule reads, and the current marker below take precedence.
					// A link takes no type, because the type of an anchor names a MIME type.
					{...props}
					type={props.href === undefined ? 'button' : undefined}
					data-slot="nav-item-inner"
					aria-current={ariaCurrent}
				>
					<TouchTarget>
						{icon && <Icon icon={icon} />}
						{children}
					</TouchTarget>
				</Button>
			</HeadlessProvider>
			{suffix != null && (
				<div data-slot="nav-item-suffix" data-density="slot" className={slots.suffix}>
					{suffix}
				</div>
			)}
			{isCurrent && (
				<ActiveIndicator ref={indicatorRef} className={hasAffix ? slots.indicator : undefined} />
			)}
		</li>
	)
}
