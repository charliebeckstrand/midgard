'use client'

import clsx from 'clsx'
import type React from 'react'
import { MenuIcon } from '../../primitives'
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
		<div className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-950">
			{/* Sidebar on desktop */}
			<div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>

			{/* Sidebar on mobile */}
			<MobileSidebar open={open} close={close}>
				{sidebar}
			</MobileSidebar>

			{/* Navbar on mobile */}
			<header className="flex items-center px-4 lg:hidden">
				<div className="py-2.5">
					<NavbarItem onClick={() => setOpen(true)} aria-label="Open navigation">
						<MenuIcon />
					</NavbarItem>
				</div>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Content */}
			<main
				ref={mainRef}
				className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64 overflow-hidden"
			>
				<div
					className={clsx(
						'flex flex-col grow py-4 px-6 lg:p-6 lg:rounded-lg lg:bg-white lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10',
						scrollable ? 'overflow-y-auto' : 'overflow-hidden',
					)}
				>
					{children}
				</div>
			</main>
		</div>
	)
}
