'use client'

import type { MouseEvent, ReactElement } from 'react'
import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { TouchTarget } from '../../primitives/touch-target'
import { k } from '../../recipes/kata/bottom-nav'
import { Icon } from '../icon'
import { useNavContext } from '../nav/context'

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
	const context = useNavContext()
	const indicator = useActiveIndicator()

	const isCurrent = current ?? (value !== undefined && context?.value === value)

	function handleClick(e: MouseEvent<HTMLElement>) {
		onClick?.(e as MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			context?.onValueChange?.(value)
		}
	}

	// The `<li>` is `flex flex-1`; the button inside also carries `flex-1`,
	// distributing both evenly across the bar. The list element adds list semantics.
	return (
		<li data-slot="bottom-nav-item-wrapper" className="flex flex-1 list-none">
			<Polymorphic
				as="button"
				data-slot="bottom-nav-item"
				href={href}
				data-current={isCurrent || undefined}
				aria-current={isCurrent ? 'page' : undefined}
				className={cn(k.item, isCurrent && k.current, className)}
				onClick={handleClick}
				{...indicator.tapHandlers}
				{...props}
			>
				<TouchTarget>
					<Icon icon={icon} />
					<span>{children}</span>
				</TouchTarget>
				{isCurrent && <ActiveIndicator ref={indicator.ref} className={cn(k.indicator)} />}
			</Polymorphic>
		</li>
	)
}
