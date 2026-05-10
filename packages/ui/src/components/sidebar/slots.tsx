'use client'

import { X } from 'lucide-react'
import { type ComponentPropsWithoutRef, type ReactNode, use } from 'react'
import { cn } from '../../core'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { k } from '../../recipes/kata/sidebar'
import { Button } from '../button'
import { Icon } from '../icon'

export type SidebarHeaderProps = ComponentPropsWithoutRef<'div'> & {
	closeIcon?: ReactNode
}

export type SidebarBodyProps = ComponentPropsWithoutRef<'div'>

export type SidebarFooterProps = ComponentPropsWithoutRef<'div'>

export function SidebarHeader({ className, children, closeIcon, ...props }: SidebarHeaderProps) {
	const offcanvas = use(OffcanvasContext)

	return (
		<div data-slot="sidebar-header" className={cn(k.header, className)} {...props}>
			<div className="flex-1">{children}</div>
			{offcanvas && (
				<Button
					variant="plain"
					aria-label="Close navigation"
					className="ml-auto"
					prefix={closeIcon ?? <Icon icon={<X />} />}
					onClick={offcanvas.close}
				/>
			)}
		</div>
	)
}

export function SidebarBody({ className, ...props }: SidebarBodyProps) {
	return <div data-slot="sidebar-body" className={cn(k.body, className)} {...props} />
}

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
	return <div data-slot="sidebar-footer" className={cn(k.footer, className)} {...props} />
}
