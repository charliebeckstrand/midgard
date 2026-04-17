'use client'

import type { ReactElement } from 'react'
import { cn } from '../../core'
import {
	ActiveIndicator,
	Polymorphic,
	type PolymorphicProps,
	TouchTarget,
	useActiveIndicator,
} from '../../primitives'
import { Icon } from '../icon'
import { useNavContext } from '../nav/context'
import { k } from './variants'

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
	const ctx = useNavContext()
	const indicator = useActiveIndicator()

	const isCurrent = current ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: React.MouseEvent<HTMLElement>) {
		onClick?.(e as React.MouseEvent<HTMLButtonElement> & React.MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return (
		<Polymorphic
			as="button"
			dataSlot="bottom-nav-item"
			href={href}
			data-current={isCurrent ? '' : undefined}
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
	)
}
