'use client'

import { Menu } from 'lucide-react'
import { type PropsWithChildren, type ReactNode, type Ref, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Box } from '../../components/box'
import { Button } from '../../components/button'
import { Drawer } from '../../components/drawer/drawer'
import { Flex } from '../../components/flex'
import { Frame } from '../../components/frame'
import { Icon } from '../../components/icon'
import { Sheet } from '../../components/sheet/sheet'
import { cn, createContext } from '../../core'
import { useScrollWithin } from '../../hooks'
import { useOffcanvas } from '../../hooks/use-offcanvas'
import { OffcanvasProvider } from '../../primitives/offcanvas'
import {
	sidebarBodyVariants,
	sidebarContentVariants,
	sidebarContentWrapperVariants,
	sidebarFloatingHotZoneVariants,
	sidebarFooterVariants,
	sidebarHeaderVariants,
	sidebarLayoutVariants,
	sidebarPanelVariants,
} from './variants'

const [SidebarLayoutContextProvider, useSidebarLayoutContext] = createContext<{
	actions?: ReactNode
}>('SidebarLayout', { default: {} })

export type SidebarLayoutProps = PropsWithChildren<{
	navbar?: ReactNode
	sidebar: ReactNode
	actions?: ReactNode
	menuIcon?: ReactNode
	stickyHeader?: boolean
	floating?: boolean
	panelClassName?: string
}>

export function SidebarLayout({
	navbar,
	sidebar,
	actions,
	menuIcon,
	stickyHeader,
	floating,
	panelClassName,
	children,
}: SidebarLayoutProps) {
	const { open, setOpen, close } = useOffcanvas()

	const [floatingOpen, setFloatingOpen] = useState(false)

	useEffect(() => {
		if (!floating) setFloatingOpen(false)
	}, [floating])

	const scrollWithin = useScrollWithin()

	return (
		<Frame className={sidebarLayoutVariants()}>
			{/* Hot zone to peek the floating sidebar */}
			{floating && (
				<div
					aria-hidden
					className={cn(sidebarFloatingHotZoneVariants())}
					onPointerEnter={() => setFloatingOpen(true)}
				/>
			)}

			{/* Sidebar on desktop — inline when locked */}
			{!floating && <div className={cn(sidebarPanelVariants(), panelClassName)}>{sidebar}</div>}

			{/* Sidebar on desktop — sheet when floating */}
			{floating && (
				<Sheet
					side="left"
					size="xs"
					open={floatingOpen}
					onOpenChange={setFloatingOpen}
					className="sm:top-0 sm:left-0 sm:bottom-0 sm:rounded-l-none"
				>
					<div
						data-autofocus
						tabIndex={-1}
						className="flex flex-col h-full outline-none"
						onPointerEnter={() => setFloatingOpen(true)}
						onPointerLeave={() => setFloatingOpen(false)}
					>
						{sidebar}
					</div>
				</Sheet>
			)}

			{/* Buffer to the right of the floating sidebar — keeps it open while pointer lingers within 40px */}
			{floating &&
				floatingOpen &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						aria-hidden
						className="fixed top-0 bottom-0 left-80 w-20 z-100 max-lg:hidden"
						onPointerEnter={() => setFloatingOpen(true)}
						onPointerLeave={() => setFloatingOpen(false)}
					/>,
					document.body,
				)}

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
			<Flex gap="lg" align="center" className="lg:p-0 p-6 lg:hidden">
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
			<SidebarLayoutContextProvider value={{ actions }}>
				<Frame direction="col" className={sidebarContentWrapperVariants({ floating })}>
					<Frame direction="col" className={sidebarContentVariants({ stickyHeader })}>
						{children}
					</Frame>
				</Frame>
			</SidebarLayoutContextProvider>
		</Frame>
	)
}

export type SidebarLayoutHeaderProps = PropsWithChildren<{ className?: string }>

export function SidebarLayoutHeader({ children, className }: SidebarLayoutHeaderProps) {
	const { actions } = useSidebarLayoutContext()

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
