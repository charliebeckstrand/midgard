import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type BaseNavItemProps, createNavItem } from '../nav'
import { k } from './variants'

export type SidebarItemProps = BaseNavItemProps

export type SidebarLabelProps = ComponentPropsWithoutRef<'span'>

export type SidebarSectionProps = ComponentPropsWithoutRef<'div'>

export type SidebarSpacerProps = ComponentPropsWithoutRef<'div'>

export type SidebarDividerProps = ComponentPropsWithoutRef<'hr'>

export type SidebarItemActionsProps = ComponentPropsWithoutRef<'div'>

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
