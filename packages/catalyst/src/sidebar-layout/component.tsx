'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { NavbarItem } from '../navbar'
import { overlayAnimation, slidePanelAnimation } from '../utils/motion'

export const MobileSidebarContext = createContext<(() => void) | null>(null)

function OpenMenuIcon() {
	return (
		<svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
		</svg>
	)
}

function MobileSidebar({ open, close, children }: React.PropsWithChildren<{ open: boolean; close: () => void }>) {
	useEffect(() => {
		if (!open) return

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') close()
		}

		document.addEventListener('keydown', onKeyDown)
		document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.body.style.overflow = ''
		}
	}, [open, close])

	return (
		<AnimatePresence>
			{open && (
				<div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
					<motion.div
						{...overlayAnimation}
						className="fixed inset-0 bg-black/30"
						onClick={close}
						aria-hidden="true"
					/>
					<motion.div
						{...slidePanelAnimation}
						className="fixed inset-y-0 left-0 w-full max-w-80 p-2"
					>
						<MobileSidebarContext.Provider value={close}>
							<div className="flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
								{children}
							</div>
						</MobileSidebarContext.Provider>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	)
}

export function SidebarLayout({
	navbar,
	sidebar,
	scrollable = true,
	children,
}: React.PropsWithChildren<{ navbar: React.ReactNode; sidebar: React.ReactNode; scrollable?: boolean }>) {
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
						<OpenMenuIcon />
					</NavbarItem>
				</div>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Content */}
			<main ref={mainRef} className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64 overflow-hidden">
				<div className={clsx(
					'flex flex-col grow py-4 px-6 lg:p-6 lg:rounded-lg lg:bg-white lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10',
					scrollable ? 'overflow-y-auto' : 'overflow-hidden',
				)}>
					{children}
				</div>
			</main>
		</div>
	)
}
