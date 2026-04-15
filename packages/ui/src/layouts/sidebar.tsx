'use client'

import { Menu } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../components/button'
import { Drawer } from '../components/drawer/drawer'
import { Icon } from '../components/icon'
import { cn } from '../core'
import { OffcanvasContext } from '../primitives/offcanvas'
import { narabi, omote } from '../recipes'
export type SidebarLayoutProps = React.PropsWithChildren<{
	navbar: React.ReactNode
	sidebar: React.ReactNode
	actions?: React.ReactNode
	menuIcon?: React.ReactNode
}>

export function SidebarLayout({
	navbar,
	sidebar,
	actions,
	menuIcon,
	children,
}: SidebarLayoutProps) {
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
				narabi.position.isolate,
				'flex h-svh w-full max-lg:flex-col overflow-hidden',
				'bg-white lg:bg-zinc-100',
				'dark:bg-zinc-950',
			)}
		>
			{/* Sidebar on desktop */}
			<div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>

			{/* Sidebar on mobile */}
			<Drawer open={open} onClose={close}>
				<OffcanvasContext.Provider value={{ close }}>
					<div
						ref={(node) => {
							if (!node) return

							const current = node.querySelector('[data-current]')

							current?.scrollIntoView({ block: 'center' })
						}}
						className="contents"
					>
						{sidebar}
					</div>
				</OffcanvasContext.Provider>
			</Drawer>

			{/* Navbar on mobile */}
			<header className="flex items-center gap-4 p-6 lg:hidden [&_nav]:p-0 [&_nav]:overflow-visible">
				<Button variant="plain" onClick={() => setOpen(true)} aria-label="Open navigation">
					{menuIcon ?? <Icon icon={<Menu />} />}
				</Button>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Persistent actions */}
			{actions && <div className="fixed top-5 right-5 z-10 max-lg:hidden">{actions}</div>}

			{/* Content */}
			<main className="flex flex-1 flex-col overflow-hidden pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64">
				<div
					className={cn(
						'flex grow flex-col min-h-0 px-6 pb-6 lg:pt-6 overflow-y-auto',
						actions && 'lg:pr-[calc(var(--spacing)*9+1px)]',
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

export type SidebarLayoutHeaderProps = React.PropsWithChildren<{ className?: string }>

export function SidebarLayoutHeader({ children, className }: SidebarLayoutHeaderProps) {
	return (
		<div data-slot="header" className={cn('shrink-0', className)}>
			{children}
		</div>
	)
}

export type SidebarLayoutBodyProps = React.PropsWithChildren<{
	className?: string
	ref?: React.Ref<HTMLDivElement>
}>

export function SidebarLayoutBody({ ref, children, className }: SidebarLayoutBodyProps) {
	return (
		<div ref={ref} data-slot="body" className={cn('flex-1 min-h-0 overflow-y-auto', className)}>
			{children}
		</div>
	)
}

export type SidebarLayoutFooterProps = React.PropsWithChildren

export function SidebarLayoutFooter({ children }: SidebarLayoutFooterProps) {
	return (
		<div data-slot="footer" className="shrink-0 pt-4 lg:pt-6">
			{children}
		</div>
	)
}
