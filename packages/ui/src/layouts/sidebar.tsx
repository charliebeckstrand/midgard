'use client'

import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../components/button'
import { Sheet } from '../components/sheet/sheet'
import { cn } from '../core'
import { MenuIcon } from '../primitives'
import { omote } from '../recipes'
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
			<Sheet side="left" size="sm" open={open} onClose={close}>
				<OffcanvasContext.Provider value={{ close }}>{sidebar}</OffcanvasContext.Provider>
			</Sheet>

			{/* Navbar on mobile */}
			<header className="flex items-center gap-4 p-6 lg:hidden [&_nav]:p-0">
				<Button variant="plain" onClick={() => setOpen(true)} aria-label="Open navigation">
					<MenuIcon />
				</Button>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Persistent actions (top-right on desktop) */}
			{actions && <div className="fixed top-5 right-5 z-10 max-lg:hidden">{actions}</div>}

			{/* Content */}
			<main className="flex flex-1 flex-col overflow-hidden pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64">
				<div
					className={cn(
						'flex grow flex-col min-h-0 px-6 pb-6 lg:pt-6 overflow-y-auto',
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

export function SidebarLayoutBody({
	ref,
	children,
	className,
}: React.PropsWithChildren<{ className?: string; ref?: React.Ref<HTMLDivElement> }>) {
	return (
		<div ref={ref} data-slot="body" className={cn('flex-1 min-h-0 overflow-y-auto', className)}>
			{children}
		</div>
	)
}

export function SidebarLayoutFooter({ children }: React.PropsWithChildren) {
	return (
		<div data-slot="footer" className="shrink-0 pt-4 lg:pt-6">
			{children}
		</div>
	)
}
