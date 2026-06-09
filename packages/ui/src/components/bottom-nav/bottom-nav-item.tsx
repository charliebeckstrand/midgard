'use client'

import type { ReactElement, Ref } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { TouchTarget } from '../../primitives/touch-target'
import { k } from '../../recipes/kata/bottom-nav'
import { Icon } from '../icon'
import { useNavItem } from '../nav/use-nav-item'

export type BottomNavItemProps = {
	value?: string
	icon: ReactElement
	current?: boolean
	className?: string
} & PolymorphicProps<'button'>

export function BottomNavItem({
	value,
	icon,
	current,
	className,
	children,
	href,
	onClick,
	...props
}: BottomNavItemProps) {
	// Shared nav-item wiring: current-state resolution against the Nav selection
	// context, scroll-into-view, offcanvas close on tap, and the composed click handler.
	const item = useNavItem({ current, value, onClick })

	// The `<li>` is `flex flex-1`; the button inside also carries `flex-1`,
	// distributing both evenly across the bar. The list element adds list semantics.
	return (
		<li
			ref={item.ref as Ref<HTMLLIElement>}
			data-slot="bottom-nav-item-wrapper"
			className="flex flex-1 list-none"
		>
			<Polymorphic
				as="button"
				data-slot="bottom-nav-item"
				href={href}
				data-current={item.current || undefined}
				aria-current={item.current ? 'page' : undefined}
				className={cn(k.item, item.current && k.current, className)}
				onClick={item.handleClick}
				{...item.indicator.tapHandlers}
				{...props}
			>
				<TouchTarget>
					<Icon icon={icon} />
					<span>{children}</span>
				</TouchTarget>
				{item.current && <ActiveIndicator ref={item.indicator.ref} className={cn(k.indicator)} />}
			</Polymorphic>
		</li>
	)
}
