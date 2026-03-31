'use client'

import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import {
	sidebarBodyVariants,
	sidebarFooterVariants,
	sidebarHeaderVariants,
	sidebarVariants,
} from './variants'

export type SidebarProps = React.ComponentPropsWithoutRef<'nav'>

export type SidebarHeaderProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarBodyProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarFooterProps = React.ComponentPropsWithoutRef<'div'>

export function Sidebar({ className, children, ...props }: SidebarProps) {
	return (
		<ActiveIndicatorScope>
			<nav data-slot="sidebar" className={cn(sidebarVariants(), className)} {...props}>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}

export function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
	return (
		<div data-slot="sidebar-header" className={cn(sidebarHeaderVariants(), className)} {...props} />
	)
}

export function SidebarBody({ className, ...props }: SidebarBodyProps) {
	return (
		<div data-slot="sidebar-body" className={cn(sidebarBodyVariants(), className)} {...props} />
	)
}

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
	return (
		<div data-slot="sidebar-footer" className={cn(sidebarFooterVariants(), className)} {...props} />
	)
}
