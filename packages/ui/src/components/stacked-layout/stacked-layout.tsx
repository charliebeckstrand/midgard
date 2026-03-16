'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CloseIcon, MenuIcon, Overlay, SlidePanel } from '../../primitives'
import { sidebarBackdrop } from '../../recipes'
import { NavbarItem } from '../navbar'

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
				<div className="flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
					<div className="-mb-3 px-4 pt-3">
						<NavbarItem onClick={close} aria-label="Close navigation">
							<CloseIcon />
						</NavbarItem>
					</div>
					{children}
				</div>
			</SlidePanel>
		</Overlay>
	)
}

export function StackedLayout({
	navbar,
	sidebar,
	children,
}: React.PropsWithChildren<{ navbar: React.ReactNode; sidebar: React.ReactNode }>) {
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
		<div className="relative isolate flex min-h-svh w-full flex-col bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
			{/* Sidebar on mobile */}
			<MobileSidebar open={showSidebar} close={closeSidebar}>
				{sidebar}
			</MobileSidebar>

			{/* Navbar */}
			<header className="flex items-center px-4" ref={mainRef as React.RefObject<HTMLElement>}>
				<div className="py-2.5 lg:hidden">
					<NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
						<MenuIcon />
					</NavbarItem>
				</div>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Content */}
			<main className="flex flex-1 flex-col pb-2 lg:px-2">
				<div className="grow p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
					<div className="mx-auto max-w-6xl">{children}</div>
				</div>
			</main>
		</div>
	)
}
