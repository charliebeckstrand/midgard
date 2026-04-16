'use client'

import { Menu } from 'lucide-react'
import type React from 'react'
import { createContext, useContext } from 'react'
import { Box } from '../../components/box'
import { Button } from '../../components/button'
import { Drawer } from '../../components/drawer/drawer'
import { Flex } from '../../components/flex'
import { Frame } from '../../components/frame'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { useOffcanvas } from '../../hooks/use-offcanvas'
import { OffcanvasContext } from '../../primitives/offcanvas'
import {
	sidebarBodyVariants,
	sidebarContentVariants,
	sidebarContentWrapperVariants,
	sidebarFooterVariants,
	sidebarHeaderVariants,
	sidebarLayoutVariants,
	sidebarPanelVariants,
} from './variants'

const SidebarLayoutContext = createContext<{ actions?: React.ReactNode }>({})

export type SidebarLayoutProps = React.PropsWithChildren<{
	navbar?: React.ReactNode
	sidebar: React.ReactNode
	actions?: React.ReactNode
	menuIcon?: React.ReactNode
	stickyHeader?: boolean
}>

export function SidebarLayout({
	navbar,
	sidebar,
	actions,
	menuIcon,
	stickyHeader,
	children,
}: SidebarLayoutProps) {
	const { open, setOpen, close } = useOffcanvas()

	return (
		<Frame className={sidebarLayoutVariants()}>
			{/* Sidebar on desktop */}
			<div className={sidebarPanelVariants()}>{sidebar}</div>

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
			<Flex gap={4} align="center" className="lg:p-0 px-6 py-2 lg:hidden">
				<Button variant="plain" onClick={() => setOpen(true)} aria-label="Open navigation">
					{menuIcon ?? <Icon icon={<Menu />} />}
				</Button>
				<div className="min-w-0 flex-1">{navbar}</div>
			</Flex>

			{/* Content */}
			<SidebarLayoutContext.Provider value={{ actions }}>
				<Frame direction="col" className={sidebarContentWrapperVariants()}>
					<Frame direction="col" className={sidebarContentVariants({ stickyHeader })}>
						{children}
					</Frame>
				</Frame>
			</SidebarLayoutContext.Provider>
		</Frame>
	)
}

export type SidebarLayoutHeaderProps = React.PropsWithChildren<{ className?: string }>

export function SidebarLayoutHeader({ children, className }: SidebarLayoutHeaderProps) {
	const { actions } = useContext(SidebarLayoutContext)

	return (
		<Box dataSlot="header" className={cn(sidebarHeaderVariants(), className)}>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className="shrink-0 max-lg:hidden">{actions}</div>}
		</Box>
	)
}

export type SidebarLayoutBodyProps = React.PropsWithChildren<{
	className?: string
	ref?: React.Ref<HTMLDivElement>
}>

export function SidebarLayoutBody({ ref, children, className }: SidebarLayoutBodyProps) {
	return (
		<Box ref={ref} dataSlot="body" className={cn(sidebarBodyVariants(), className)}>
			{children}
		</Box>
	)
}

export type SidebarLayoutFooterProps = React.PropsWithChildren

export function SidebarLayoutFooter({ children }: SidebarLayoutFooterProps) {
	return (
		<Box dataSlot="footer" className={sidebarFooterVariants()}>
			{children}
		</Box>
	)
}
