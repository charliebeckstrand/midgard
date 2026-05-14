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
import { ActiveIndicator, useActiveIndicator } from './active-indicator'
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
	variants: () => string
	/** Wraps the icon prop. Callers pass their own Icon component so primitives stay layer-clean. */
	renderIcon: (icon: ReactElement) => ReactNode
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
					className={cn(config.variants(), 'relative z-10', className)}
					onClick={handleClick}
					{...props}
				>
					<TouchTarget>
						{icon && config.renderIcon(icon)}
						{children}
					</TouchTarget>
				</Polymorphic>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		)
	}

	return NavItem
}
