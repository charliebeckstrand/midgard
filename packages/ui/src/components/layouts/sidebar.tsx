'use client'

import React from 'react'
import { cn } from '../../core'
import { MenuIcon } from '../../primitives'
import { omote } from '../../recipes'
import { NavbarItem } from '../navbar'
import { MobileSidebar } from './mobile-sidebar'
import { useMobileSidebar } from './use-mobile-sidebar'

export function SidebarLayout({
	navbar,
	sidebar,
	scrollable = true,
	children,
}: React.PropsWithChildren<{
	navbar: React.ReactNode
	sidebar: React.ReactNode
	scrollable?: boolean
}>) {
	const { open, setOpen, close, mainRef } = useMobileSidebar()

	return (
		<div
			className={cn(
				'relative isolate flex h-svh w-full max-lg:flex-col',
				'bg-white lg:bg-zinc-100',
				'dark:bg-zinc-950',
			)}
		>
			{/* Sidebar on desktop */}
			<div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>

			{/* Sidebar on mobile */}
			<MobileSidebar open={open} close={close}>
				{sidebar}
			</MobileSidebar>

			{/* Navbar on mobile */}
			<header className="flex items-center px-4 lg:hidden">
				<NavbarItem onClick={() => setOpen(true)} aria-label="Open navigation">
					<MenuIcon />
				</NavbarItem>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Content */}
			<main
				ref={mainRef}
				className={cn(
					'flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64',
					scrollable ? 'overflow-hidden' : 'overflow-auto',
				)}
			>
				<div
					className={cn(
						'flex flex-col grow p-6',
						scrollable && 'overflow-hidden',
						omote.content,
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
		<div data-slot="footer" className="shrink-0">
			{children}
		</div>
	)
}
