'use client'

import clsx from 'clsx'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MenuIcon, Overlay, SlidePanel } from '../../primitives'
import { sidebarBackdrop } from '../../recipes'
import { NavbarItem } from '../navbar'
import { MobileSidebarContext } from './context'

function MobileSidebar({
	open,
	close,
	children,
}: React.PropsWithChildren<{ open: boolean; close: () => void }>) {
	return (
		<Overlay
			open={open}
			onClose={close}
			className={sidebarBackdrop}
			role="dialog"
			aria-modal="true"
		>
			<SlidePanel>
				<MobileSidebarContext.Provider value={close}>
					<div className="flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
						{children}
					</div>
				</MobileSidebarContext.Provider>
			</SlidePanel>
		</Overlay>
	)
}

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
	const [showSidebar, setShowSidebar] = useState(false)
	const closeSidebar = useCallback(() => setShowSidebar(false), [])
	const mainRef = useRef<HTMLElement>(null)

	useEffect(() => {
		if (mainRef.current) {
			if (showSidebar) {
				mainRef.current.setAttribute('inert', '')
			} else {
				mainRef.current.removeAttribute('inert')
			}
		}
	}, [showSidebar])

	return (
		<div className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
			{/* Sidebar on desktop */}
			<div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>

			{/* Sidebar on mobile */}
			<MobileSidebar open={showSidebar} close={closeSidebar}>
				{sidebar}
			</MobileSidebar>

			{/* Navbar on mobile */}
			<header className="flex items-center px-4 lg:hidden">
				<div className="py-2.5">
					<NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
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
