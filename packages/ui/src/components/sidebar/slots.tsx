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
	/** Glyph for the auto-injected close button shown inside an offcanvas drawer. @defaultValue an `X` icon */
	closeIcon?: ReactNode
}

export type SidebarBodyProps = SlotProps<'div'>

export type SidebarFooterProps = SlotProps<'div'>

/**
 * Top region of a `Sidebar` for brand or affordances. Inside an offcanvas
 * drawer it auto-appends a close button (labeled "Close navigation") wired to
 * the drawer's dismiss; pass `closeIcon` to override its glyph.
 */
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

/** Scrollable main region of a `Sidebar` holding its sections and lists. */
export const SidebarBody = createSlot('div', 'sidebar-body', k.body)

/** Bottom region of a `Sidebar`, pinned below the body for footer content. */
export const SidebarFooter = createSlot('div', 'sidebar-footer', k.footer)
