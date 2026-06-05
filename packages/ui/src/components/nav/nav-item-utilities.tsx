'use client'

import {
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	use,
	useLayoutEffect,
	useRef,
} from 'react'
import { cn } from '../../core'
import { useScrollWithin } from '../../hooks'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { useDensity } from '../../primitives/density'
import { OffcanvasContext } from '../../primitives/offcanvas'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { TouchTarget } from '../../primitives/touch-target'
import type { Step } from '../../recipes'
import { Button } from '../button'
import { Headless } from '../headless'

/**
 * Canonical props for nav-item-style components produced by `createNavItem`.
 * Consumers like SidebarItem and the Nav family's NavItem extend this with
 * their own extra props (e.g. `value` for selection binding).
 */
export type NavItemProps = {
	icon?: ReactElement
	current?: boolean
	className?: string
	preventClose?: boolean
	spring?: boolean
	/** Rendered before the inner button, outside it so the slot can host its own interactive element (e.g. a drag handle button). */
	prefix?: ReactNode
	/** Rendered after the inner button, outside it so the slot can host its own interactive element (e.g. an actions button). */
	suffix?: ReactNode
	// `color` conflicts with `<Button>`'s variant union; `ref` differs between anchor/button branches; `prefix` is a string-typed RDFa global we repurpose as a slot.
} & PolymorphicProps<'button', 'color' | 'ref' | 'prefix'>

export type NavItemConfig = {
	slotPrefix: string
	/** Receives the resolved size so callers can vary classes per step. */
	variants: (props: { size: Step }) => string
	/** Wraps the icon prop. Receives the resolved size so the icon can scale with the item. */
	renderIcon: (icon: ReactElement, size: Step) => ReactNode
}

/**
 * Factory for navigation item components (NavbarItem, SidebarItem).
 * Both share identical structure; only the data-slot prefix, variant, and
 * icon wrapper differ.
 *
 * The inner interactive element renders as `<Headless><Button>` so it picks up
 * Button's cascades (Density size, headless chrome stripping, link/button
 * polymorphism) while still presenting as the consumer-defined `*-item-inner`
 * slot.
 */
export function createNavItem(config: NavItemConfig) {
	const innerSlot = `${config.slotPrefix}-item-inner`

	function NavItem({
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
	}: NavItemProps & { size?: Step }) {
		const itemRef = useRef<HTMLSpanElement>(null)

		const indicator = useActiveIndicator()
		const inherited = useDensity()

		const resolvedSize = size ?? inherited.size

		const offcanvas = use(OffcanvasContext)

		const scrollWithin = useScrollWithin()

		useLayoutEffect(() => {
			if (current && itemRef.current) {
				scrollWithin(itemRef.current, { block: 'nearest' })
			}
		}, [current, scrollWithin])

		function handleClick(e: MouseEvent<HTMLElement>) {
			onClick?.(e as MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>)

			if (!preventClose) {
				offcanvas?.close()
			}
		}

		// Affixes render as siblings of the inner button — never nested inside it —
		// so a slot can host its own interactive element without producing invalid
		// nested-interactive markup. The row only goes flex when an affix exists,
		// leaving the affix-less DOM and layout untouched.
		const hasAffix = prefix != null || suffix != null

		return (
			<span
				ref={itemRef}
				data-slot={`${config.slotPrefix}-item`}
				className={cn('group relative', hasAffix && 'flex items-center gap-1')}
				{...(spring ? indicator.tapHandlers : {})}
			>
				{prefix != null && (
					<span
						data-slot={`${config.slotPrefix}-item-prefix`}
						className="relative z-10 flex shrink-0 items-center"
					>
						{prefix}
					</span>
				)}
				<Headless>
					<Button
						data-slot={innerSlot}
						data-current={current || undefined}
						aria-current={current ? 'page' : undefined}
						className={cn(
							config.variants({ size: resolvedSize }),
							'relative z-10',
							hasAffix && 'min-w-0 flex-1',
							className,
						)}
						onClick={handleClick}
						{...props}
					>
						<TouchTarget>
							{icon && config.renderIcon(icon, resolvedSize)}
							{children}
						</TouchTarget>
					</Button>
				</Headless>
				{suffix != null && (
					<span
						data-slot={`${config.slotPrefix}-item-suffix`}
						className="relative z-10 flex shrink-0 items-center"
					>
						{suffix}
					</span>
				)}
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		)
	}

	return NavItem
}
