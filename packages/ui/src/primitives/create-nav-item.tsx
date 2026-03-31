'use client'

import { cn } from '../core'
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
	function NavItem({ current, className, children, ...props }: NavItemProps) {
		const indicator = useActiveIndicator()

		return (
			<span
				data-slot={`${config.slotPrefix}-item`}
				className="group relative"
				{...indicator.tapHandlers}
			>
				<Polymorphic
					as="button"
					dataSlot={`${config.slotPrefix}-item-inner`}
					href={props.href}
					data-current={current ? '' : undefined}
					className={cn(config.variants(), className)}
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
