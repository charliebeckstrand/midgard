import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'

export type SidebarSpacerProps = ComponentPropsWithoutRef<'div'>

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
