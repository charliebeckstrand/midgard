'use client'

import { cn } from '../../core'
import {
	ActiveIndicator,
	Polymorphic,
	type PolymorphicProps,
	TouchTarget,
	useActiveIndicator,
} from '../../primitives'
import { sidebarItemVariants, sidebarLabelVariants, sidebarSectionVariants } from './variants'

type SidebarItemBaseProps = {
	current?: boolean
	className?: string
}

export type SidebarItemProps = SidebarItemBaseProps & PolymorphicProps<'button'>

export type SidebarLabelProps = React.ComponentPropsWithoutRef<'span'>

export type SidebarSectionProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarSpacerProps = React.ComponentPropsWithoutRef<'div'>

export function SidebarItem({ current, className, children, ...props }: SidebarItemProps) {
	const indicator = useActiveIndicator()

	return (
		<span data-slot="sidebar-item" className="group relative" {...indicator.tapHandlers}>
			<Polymorphic
				as="button"
				dataSlot="sidebar-item-inner"
				href={props.href}
				data-current={current ? '' : undefined}
				className={cn(sidebarItemVariants(), className)}
				{...props}
			>
				<TouchTarget>{children}</TouchTarget>
			</Polymorphic>
			{current && <ActiveIndicator ref={indicator.ref} />}
		</span>
	)
}

export function SidebarLabel({ className, ...props }: SidebarLabelProps) {
	return (
		<span data-slot="sidebar-label" className={cn(sidebarLabelVariants(), className)} {...props} />
	)
}

export function SidebarSection({ className, ...props }: SidebarSectionProps) {
	return (
		<div
			data-slot="sidebar-section"
			className={cn(sidebarSectionVariants(), className)}
			{...props}
		/>
	)
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
