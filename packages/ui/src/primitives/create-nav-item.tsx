'use client'

import { cn } from '../core'
import { useOffcanvas } from '../layouts/context'
import {
	ActiveIndicator,
	Polymorphic,
	type PolymorphicProps,
	TouchTarget,
	useActiveIndicator,
} from '.'

export type NavItemProps = {
	current?: boolean
	className?: string
} & PolymorphicProps<'button'>

/**
 * Factory for navigation item components (NavbarItem, SidebarItem).
 *
 * Both share identical structure: animated active indicator + polymorphic
 * button/link + touch target. Only the data-slot prefix and variant
 * function differ.
 */
export function createNavItem(config: { slotPrefix: string; variants: () => string }) {
	function NavItem({ current, className, children, onClick, href, ...props }: NavItemProps) {
		const indicator = useActiveIndicator()
		const offcanvas = useOffcanvas()

		function handleClick(e: React.MouseEvent<HTMLElement>) {
			onClick?.(e as React.MouseEvent<HTMLButtonElement> & React.MouseEvent<HTMLAnchorElement>)

			offcanvas?.close()
		}

		return (
			<span
				data-slot={`${config.slotPrefix}-item`}
				className="group relative"
				{...indicator.tapHandlers}
			>
				<Polymorphic
					as="button"
					dataSlot={`${config.slotPrefix}-item-inner`}
					href={href}
					data-current={current ? '' : undefined}
					className={cn(config.variants(), className)}
					onClick={handleClick}
					{...props}
				>
					<TouchTarget>{children}</TouchTarget>
				</Polymorphic>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		)
	}

	return NavItem
}
