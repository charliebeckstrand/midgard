'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { cn } from '../../core'
import { MenuIcon } from '../../primitives'
import { omote } from '../../recipes'
import { NavbarItem } from '../navbar'
import { SheetContent } from '../sheet/content'
import { Sheet } from '../sheet/sheet'
import { OffcanvasContext } from './context'

export function SidebarLayout({
	navbar,
	sidebar,
	actions,
	children,
}: React.PropsWithChildren<{
	navbar: React.ReactNode
	sidebar: React.ReactNode
	actions?: React.ReactNode
}>) {
	const [open, setOpen] = useState(false)

	const close = useCallback(() => setOpen(false), [])

	// Auto-close mobile sidebar when viewport crosses the lg breakpoint
	useEffect(() => {
		const breakpoint = getComputedStyle(document.documentElement)
			.getPropertyValue('--breakpoint-lg')
			.trim()

		const mql = window.matchMedia(`(min-width: ${breakpoint})`)

		const handler = () => {
			if (mql.matches) setOpen(false)
		}

		mql.addEventListener('change', handler)

		return () => mql.removeEventListener('change', handler)
	}, [])

	return (
		<div
			className={cn(
				'relative isolate flex h-svh w-full max-lg:flex-col overflow-hidden',
				'bg-white lg:bg-zinc-100',
				'dark:bg-zinc-950',
			)}
		>
			{/* Sidebar on desktop */}
			<div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>

			{/* Sidebar on mobile */}
			<Sheet side="left" open={open} onOpenChange={setOpen}>
				<SheetContent size="sm" backdropClassName={omote.sidebar}>
					<OffcanvasContext.Provider value={{ close }}>{sidebar}</OffcanvasContext.Provider>
				</SheetContent>
			</Sheet>

			{/* Navbar on mobile */}
			<header className="flex items-center p-6 gap-4 lg:hidden [&_nav]:p-0">
				<NavbarItem onClick={() => setOpen(true)} aria-label="Open navigation">
					<MenuIcon />
				</NavbarItem>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Persistent actions (top-right on desktop) */}
			{actions && <div className="fixed top-5 right-5 z-10 max-lg:hidden">{actions}</div>}

			{/* Content */}
			<main className="flex flex-1 flex-col overflow-hidden pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64">
				<div
					className={cn(
						'flex flex-col grow min-h-0 px-6 pb-6 lg:pt-6 overflow-y-auto',
						omote.content,
						'[&>[data-slot=header]>nav]:p-0',
						'[&:has([data-slot=footer])>[data-slot=body]]:pb-0',
					)}
				>
					{children}
				</div>
			</main>
		</div>
	)
}

export function SidebarLayoutHeader({
	children,
	className,
}: React.PropsWithChildren<{ className?: string }>) {
	return (
		<div data-slot="header" className={cn('shrink-0', className)}>
			{children}
		</div>
	)
}

export const SidebarLayoutBody = React.forwardRef<
	HTMLDivElement,
	React.PropsWithChildren<{ className?: string }>
>(function SidebarLayoutBody({ children, className }, ref) {
	return (
		<div ref={ref} data-slot="body" className={cn('flex-1 min-h-0 overflow-y-auto', className)}>
			{children}
		</div>
	)
})

export function SidebarLayoutFooter({ children }: React.PropsWithChildren) {
	return (
		<div data-slot="footer" className="shrink-0 pt-4 lg:pt-6">
			{children}
		</div>
	)
}
