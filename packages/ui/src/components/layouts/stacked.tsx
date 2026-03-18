'use client'

import type React from 'react'
import { cn } from '../../core'
import { CloseIcon, MenuIcon } from '../../primitives'
import { omote } from '../../recipes'
import { NavbarItem } from '../navbar'
import { MobileSidebar } from './mobile-sidebar'
import { useMobileSidebar } from './use-mobile-sidebar'

export function StackedLayout({
	navbar,
	sidebar,
	children,
}: React.PropsWithChildren<{ navbar: React.ReactNode; sidebar: React.ReactNode }>) {
	const { open, setOpen, close, mainRef } = useMobileSidebar()

	return (
		<div
			className={cn(
				'relative isolate flex min-h-svh w-full flex-col',
				'bg-zinc-100',
				'dark:bg-zinc-950',
			)}
		>
			{/* Sidebar on mobile */}
			<MobileSidebar
				open={open}
				close={close}
				header={
					<div className="-mb-3 px-4 pt-3">
						<NavbarItem onClick={close} aria-label="Close navigation">
							<CloseIcon />
						</NavbarItem>
					</div>
				}
			>
				{sidebar}
			</MobileSidebar>

			{/* Navbar */}
			<header className="flex items-center px-4" ref={mainRef as React.RefObject<HTMLElement>}>
				<div className="py-2.5 lg:hidden">
					<NavbarItem onClick={() => setOpen(true)} aria-label="Open navigation">
						<MenuIcon />
					</NavbarItem>
				</div>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Content */}
			<main className="flex flex-1 flex-col pb-2 lg:px-2">
				<div className={cn(`grow p-6 lg:p-10 ${omote.content}`)}>
					<div className="mx-auto max-w-6xl">{children}</div>
				</div>
			</main>
		</div>
	)
}
