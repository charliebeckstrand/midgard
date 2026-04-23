'use client'

import { type MouseEvent, type ReactElement, useLayoutEffect, useRef } from 'react'
import { cn } from '../../core'
import { useScrollWithin } from '../../hooks'
import {
	ActiveIndicator,
	Polymorphic,
	type PolymorphicProps,
	TouchTarget,
	useActiveIndicator,
} from '../../primitives'
import { useOffcanvas } from '../../primitives/offcanvas'
import { Icon } from '../icon'

export type NavItemProps = {
	icon?: ReactElement
	current?: boolean
	className?: string
	preventClose?: boolean
	spring?: boolean
} & PolymorphicProps<'button'>

/**
 * Factory for navigation item components (NavbarItem, SidebarItem).
 * Both share identical structure; only the data-slot prefix and variant differ.
 */
export function createNavItem(config: { slotPrefix: string; variants: () => string }) {
	const innerSlot = `${config.slotPrefix}-item-inner`

	function NavItem({
		icon,
		current,
		className,
		children,
		href,
		preventClose,
		spring = false,
		onClick,
		...props
	}: NavItemProps) {
		const itemRef = useRef<HTMLSpanElement>(null)

		const indicator = useActiveIndicator()

		const offcanvas = useOffcanvas()

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
					className={cn(config.variants(), 'relative z-10', className)}
					onClick={handleClick}
					{...props}
				>
					<TouchTarget>
						{icon && <Icon icon={icon} />}
						{children}
					</TouchTarget>
				</Polymorphic>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		)
	}

	return NavItem
}
