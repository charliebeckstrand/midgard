'use client'

import { cn } from '../../core'
import { useOffcanvas } from '../../layouts/context'
import { CloseIcon } from '../../primitives'
import { Button } from '../button'
import { sidebarBodyVariants, sidebarFooterVariants, sidebarHeaderVariants } from './variants'

export type SidebarHeaderProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarBodyProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarFooterProps = React.ComponentPropsWithoutRef<'div'>

export function SidebarHeader({ className, children, ...props }: SidebarHeaderProps) {
	const offcanvas = useOffcanvas()

	return (
		<div data-slot="sidebar-header" className={cn(sidebarHeaderVariants(), className)} {...props}>
			<div className="flex-1">{children}</div>
			{offcanvas && (
				<Button
					variant="plain"
					aria-label="Close navigation"
					onClick={offcanvas.close}
					className="ml-auto"
				>
					<CloseIcon />
				</Button>
			)}
		</div>
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
