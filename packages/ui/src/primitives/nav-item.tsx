'use client'

import {
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	use,
	useLayoutEffect,
	useRef,
} from 'react'
import { cn } from '../core'
import { useScrollWithin } from '../hooks'
import type { Step } from '../recipes/ryu/sun'
import { ActiveIndicator, useActiveIndicator } from './active-indicator'
import { useConcentric } from './concentric'
import { OffcanvasContext } from './offcanvas'
import { Polymorphic, type PolymorphicProps } from './polymorphic'
import { TouchTarget } from './touch-target'

export type NavItemProps = {
	icon?: ReactElement
	current?: boolean
	className?: string
	preventClose?: boolean
	spring?: boolean
} & PolymorphicProps<'button'>

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
 */
export function createNavItem(config: NavItemConfig) {
	const innerSlot = `${config.slotPrefix}-item-inner`

	function NavItem({
		icon,
		current,
		size,
		className,
		children,
		href,
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
				<Polymorphic
					as="button"
					dataSlot={innerSlot}
					href={href}
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
				</Polymorphic>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		)
	}

	return NavItem
}
