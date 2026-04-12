'use client'

import { cn } from '../../core'
import { createNavItem, type NavItemProps } from '../nav'
import { katachi } from '../../recipes'

const k = katachi.sidebar

export type SidebarItemProps = NavItemProps

export type SidebarLabelProps = React.ComponentPropsWithoutRef<'span'>

export type SidebarSectionProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarSpacerProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarDividerProps = React.ComponentPropsWithoutRef<'hr'>

export type SidebarItemActionsProps = React.ComponentPropsWithoutRef<'div'>

export const sidebarItemVariants = () => cn(k.item)

export const SidebarItem = createNavItem({ slotPrefix: 'sidebar', variants: sidebarItemVariants })

export function SidebarLabel({ className, ...props }: SidebarLabelProps) {
	return <span data-slot="sidebar-label" className={cn(k.label, className)} {...props} />
}

export function SidebarSection({ className, ...props }: SidebarSectionProps) {
	return <div data-slot="sidebar-section" className={cn(k.section, className)} {...props} />
}

export function SidebarSpacer({ className, ...props }: SidebarSpacerProps) {
	return (
		<div
			data-slot="sidebar-spacer"
			aria-hidden="true"
			className={cn('mt-auto', className)}
			{...props}
		/>
	)
}

export function SidebarDivider({ className, ...props }: SidebarDividerProps) {
	return <hr data-slot="sidebar-divider" className={cn(k.divider, className)} {...props} />
}

export function SidebarItemActions({ className, ...props }: SidebarItemActionsProps) {
	return (
		<div
			data-slot="sidebar-item-actions"
			className={cn('flex items-center gap-1', className)}
			{...props}
		/>
	)
}
