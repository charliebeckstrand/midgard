'use client'

import { cn } from '../../core'
import { Nav, NavList, type NavProps } from '../nav'
import { k } from './variants'

export type BottomNavProps = NavProps

export function BottomNav({ className, children, ...props }: BottomNavProps) {
	return (
		<Nav {...props}>
			<NavList orientation="horizontal" className={cn(k.base, className)}>
				{children}
			</NavList>
		</Nav>
	)
}
