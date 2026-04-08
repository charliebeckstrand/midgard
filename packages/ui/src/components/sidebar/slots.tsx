'use client'

import { X } from 'lucide-react'
import { cn } from '../../core'
import { useOffcanvas } from '../../core/offcanvas-context'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { Icon } from '../icon'

const k = katachi.sidebar

export type SidebarHeaderProps = React.ComponentPropsWithoutRef<'div'> & {
	closeIcon?: React.ReactNode
}

export type SidebarBodyProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarFooterProps = React.ComponentPropsWithoutRef<'div'>

export function SidebarHeader({ className, children, closeIcon, ...props }: SidebarHeaderProps) {
	const offcanvas = useOffcanvas()

	return (
		<div data-slot="sidebar-header" className={cn(k.header, className)} {...props}>
			<div className="flex-1">{children}</div>
			{offcanvas && (
				<Button
					variant="plain"
					aria-label="Close navigation"
					onClick={offcanvas.close}
					className="ml-auto"
				>
					{closeIcon ?? <Icon icon={<X />} />}
				</Button>
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
