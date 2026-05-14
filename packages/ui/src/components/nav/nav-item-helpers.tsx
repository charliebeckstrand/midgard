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
import {
	ActiveIndicator,
	OffcanvasContext,
	type PolymorphicProps,
	TouchTarget,
	useActiveIndicator,
	useConcentric,
} from '../../primitives'
import type { Step } from '../../recipes/ryu/sun'
import { Button } from '../button'
import { Headless } from '../headless'

export type NavItemProps = {
	icon?: ReactElement
	current?: boolean
	className?: string
	preventClose?: boolean
	spring?: boolean
	// `color` conflicts with `<Button>`'s variant union; `ref` differs between anchor/button branches.
} & PolymorphicProps<'button', 'color' | 'ref'>

export type NavItemConfig = {
	slotPrefix: string
	/** Receives the resolved size so callers can vary classes per step. */
	variants: (size: Step) => string
	/** Wraps the icon prop. Receives the resolved size so the icon can scale with the item. */
	renderIcon: (icon: ReactElement, size: Step) => ReactNode
}

/**
 * Factory for navigation item components (NavbarItem, SidebarItem).
 * Both share identical structure; only the data-slot prefix, variant, and
 * icon wrapper differ.
 *
 * The inner interactive element renders as `<Headless><Button>` so it picks up
 * Button's cascades (concentric size, headless chrome stripping, link/button
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
		onClick,
		...props
	}: NavItemProps & { size?: Step }) {
		const itemRef = useRef<HTMLSpanElement>(null)

		const indicator = useActiveIndicator()

		const concentric = useConcentric()

		const resolvedSize = size ?? concentric?.size ?? 'md'

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

		return (
			<span
				ref={itemRef}
				data-slot={`${config.slotPrefix}-item`}
				className="group relative"
				{...(spring ? indicator.tapHandlers : {})}
			>
				<Headless>
					<Button
						dataSlot={innerSlot}
						data-current={current ? '' : undefined}
						aria-current={current ? 'page' : undefined}
						className={cn(config.variants(resolvedSize), 'relative z-10', className)}
						onClick={handleClick}
						{...props}
					>
						<TouchTarget>
							{icon && config.renderIcon(icon, resolvedSize)}
							{children}
						</TouchTarget>
					</Button>
				</Headless>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		)
	}

	return NavItem
}
