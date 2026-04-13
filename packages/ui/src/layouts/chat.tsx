'use client'

import { Menu } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Box } from '../components/box'
import { Button } from '../components/button'
import { Divider } from '../components/divider'
import { Drawer } from '../components/drawer/drawer'
import { Icon } from '../components/icon'
import { Stack } from '../components/stack'
import { cn } from '../core'
import { OffcanvasContext } from '../core/offcanvas-context'
import { narabi, omote } from '../recipes'

export type ChatLayoutProps = React.PropsWithChildren<{
	sidebar: React.ReactNode
	navbar?: React.ReactNode
}>

export function ChatLayout({ sidebar, navbar, children }: ChatLayoutProps) {
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
		<Stack
			direction="row"
			gap={0}
			className={cn(
				narabi.position.isolate,
				'h-dvh w-full max-lg:flex-col overflow-hidden',
				'bg-white lg:bg-zinc-100',
				'dark:bg-zinc-950',
			)}
		>
			{/* Sidebar on desktop */}
			<div className="w-72 shrink-0 max-lg:hidden">{sidebar}</div>

			{/* Sidebar on mobile */}
			<Drawer open={open} onClose={close}>
				<OffcanvasContext.Provider value={{ close }}>{sidebar}</OffcanvasContext.Provider>
			</Drawer>

			{/* Content */}
			<Stack gap={0} className="flex-1 min-w-0 max-lg:h-dvh lg:py-2 lg:pr-2">
				{/* Navbar on mobile */}
				<Stack direction="row" align="center" gap={4} className="px-4 py-3 lg:hidden">
					<Button variant="plain" onClick={() => setOpen(true)} aria-label="Open navigation">
						<Icon icon={<Menu />} />
					</Button>
					<div className="min-w-0 flex-1">{navbar}</div>
				</Stack>

				<Stack gap={0} className={cn('flex-1 min-h-0', omote.content)}>
					{children}
				</Stack>
			</Stack>
		</Stack>
	)
}

export type ChatLayoutHeaderProps = React.PropsWithChildren<{ className?: string }>

export function ChatLayoutHeader({ children, className }: ChatLayoutHeaderProps) {
	return (
		<>
			<Box px={6} py={4} dataSlot="header" className={cn('shrink-0', className)}>
				{children}
			</Box>
			<Divider soft />
		</>
	)
}

export type ChatLayoutBodyProps = React.PropsWithChildren<{
	className?: string
	ref?: React.Ref<HTMLDivElement>
}>

export function ChatLayoutBody({ ref, children, className }: ChatLayoutBodyProps) {
	return (
		<Box
			ref={ref}
			px={6}
			py={4}
			dataSlot="body"
			className={cn('flex-1 min-h-0 overflow-y-auto', className)}
		>
			{children}
		</Box>
	)
}

export type ChatLayoutFooterProps = React.PropsWithChildren<{ className?: string }>

export function ChatLayoutFooter({ children, className }: ChatLayoutFooterProps) {
	return (
		<>
			<Divider soft />
			<Box px={6} py={4} dataSlot="footer" className={cn('shrink-0', className)}>
				{children}
			</Box>
		</>
	)
}
