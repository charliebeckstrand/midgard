'use client'

import { X } from 'lucide-react'
import { type ReactNode, use } from 'react'
import { cn, createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { k } from '../../recipes/kata/sidebar'
import { Button } from '../button'
import { Icon } from '../icon'

export type SidebarHeaderProps = SlotProps<'div'> & {
	closeIcon?: ReactNode
}

export type SidebarBodyProps = SlotProps<'div'>

export type SidebarFooterProps = SlotProps<'div'>

export function SidebarHeader({ className, children, closeIcon, ...props }: SidebarHeaderProps) {
	const offcanvas = use(OffcanvasContext)

	return (
		<div data-slot="sidebar-header" className={cn(k.header, className)} {...props}>
			{children}
			{offcanvas && (
				<Button
					variant="bare"
					aria-label="Close navigation"
					className="ml-auto"
					prefix={closeIcon ?? <Icon icon={<X />} />}
					onClick={offcanvas.close}
				/>
			)}
		</div>
	)
}

export const SidebarBody = createSlot('div', 'sidebar-body', k.body)

export const SidebarFooter = createSlot('div', 'sidebar-footer', k.footer)
