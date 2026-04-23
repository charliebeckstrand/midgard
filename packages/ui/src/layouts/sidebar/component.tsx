'use client'

import { Menu } from 'lucide-react'
import { createContext, type PropsWithChildren, type ReactNode, type Ref, useContext } from 'react'
import { Box } from '../../components/box'
import { Button } from '../../components/button'
import { Drawer } from '../../components/drawer/drawer'
import { Flex } from '../../components/flex'
import { Frame } from '../../components/frame'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { useScrollWithin } from '../../hooks'
import { useOffcanvas } from '../../hooks/use-offcanvas'
import { OffcanvasProvider } from '../../primitives/offcanvas'
import {
	sidebarBodyVariants,
	sidebarContentVariants,
	sidebarContentWrapperVariants,
	sidebarFooterVariants,
	sidebarHeaderVariants,
	sidebarLayoutVariants,
	sidebarPanelVariants,
} from './variants'

const SidebarLayoutContext = createContext<{ actions?: ReactNode }>({})

export type SidebarLayoutProps = PropsWithChildren<{
	navbar?: ReactNode
	sidebar: ReactNode
	actions?: ReactNode
	menuIcon?: ReactNode
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

	const scrollWithin = useScrollWithin()

	return (
		<Frame className={sidebarLayoutVariants()}>
			{/* Sidebar on desktop */}
			<div className={sidebarPanelVariants()}>{sidebar}</div>

			{/* Sidebar on mobile */}
			<Drawer open={open} onOpenChange={setOpen}>
				<OffcanvasProvider value={{ close }}>
					<div
						ref={(node) => {
							if (!node) return

							const current = node.querySelector<HTMLElement>('[data-current]')

							if (current) scrollWithin(current, { block: 'center' })
						}}
						className="contents"
					>
						{sidebar}
					</div>
				</OffcanvasProvider>
			</Drawer>

			{/* Navbar on mobile */}
			<Flex gap={4} align="center" className="lg:p-0 p-6 lg:hidden">
				<Button
					variant="plain"
					aria-label="Open navigation"
					prefix={menuIcon ?? <Icon icon={<Menu />} />}
					onClick={() => setOpen(true)}
				/>
				{navbar && <div className="min-w-0 flex-1">{navbar}</div>}
				{actions && <div className="shrink-0 ml-auto">{actions}</div>}
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

export type SidebarLayoutHeaderProps = PropsWithChildren<{ className?: string }>

export function SidebarLayoutHeader({ children, className }: SidebarLayoutHeaderProps) {
	const { actions } = useContext(SidebarLayoutContext)

	return (
		<Box dataSlot="header" className={cn(sidebarHeaderVariants(), className)}>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className="shrink-0 max-lg:hidden">{actions}</div>}
		</Box>
	)
}

export type SidebarLayoutBodyProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLDivElement>
}>

export function SidebarLayoutBody({ ref, children, className }: SidebarLayoutBodyProps) {
	return (
		<Box ref={ref} dataSlot="body" className={cn(sidebarBodyVariants(), className)}>
			{children}
		</Box>
	)
}

export type SidebarLayoutFooterProps = PropsWithChildren

export function SidebarLayoutFooter({ children }: SidebarLayoutFooterProps) {
	return (
		<Box dataSlot="footer" className={sidebarFooterVariants()}>
			{children}
		</Box>
	)
}
