'use client'

import { Menu } from 'lucide-react'
import {
	type PropsWithChildren,
	type ReactNode,
	type Ref,
	useEffect,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/button'
import { Drawer } from '../../components/drawer/drawer'
import { Flex } from '../../components/flex'
import { Frame } from '../../components/frame'
import { Icon } from '../../components/icon'
import { Sheet } from '../../components/sheet/sheet'
import { cn, createContext } from '../../core'
import { useScrollWithin } from '../../hooks'
import { useOffcanvas } from '../../hooks/use-offcanvas'
import { useDensity } from '../../primitives/density'
import { OffcanvasProvider } from '../../primitives/offcanvas'
import { k } from './variants'

const [SidebarLayoutContextProvider, useSidebarLayoutContext] = createContext<{
	actions?: ReactNode
	size?: 'sm' | 'md' | 'lg'
}>('SidebarLayout', { default: {} })

function navbarPaddingForSize(size: 'sm' | 'md' | 'lg'): string {
	if (size === 'sm') return 'p-4'
	if (size === 'lg') return 'p-8'

	return 'p-6'
}

type SidebarLayoutProps = PropsWithChildren<{
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

	// Resets the floating sheet to closed when `floating` flips off, so a later
	// re-enable doesn't restore a stale-open state from a previous mount cycle.
	useEffect(() => {
		if (!floating) setFloatingOpen(false)
	}, [floating])

	const scrollWithin = useScrollWithin()

	const floatingInitialFocusRef = useRef<HTMLDivElement>(null)

	const { size } = useDensity()

	return (
		<Frame className={k.layout()}>
			{/* Hot zone to peek the floating sidebar */}
			{floating && (
				<div
					aria-hidden
					className={cn(k.floatingHotZone())}
					onPointerEnter={() => setFloatingOpen(true)}
				/>
			)}

			{/* Sidebar on desktop — inline when locked */}
			{!floating && <div className={cn(k.panel(), panelClassName)}>{sidebar}</div>}

			{/* Sidebar on desktop — sheet when floating */}
			{floating && (
				<Sheet
					side="left"
					size="xs"
					open={floatingOpen}
					onOpenChange={setFloatingOpen}
					initialFocus={floatingInitialFocusRef}
					className="sm:top-0 sm:left-0 sm:bottom-0 sm:rounded-l-none"
				>
					<div
						ref={floatingInitialFocusRef}
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
						className="fixed top-0 bottom-0 left-80 w-10 z-100 max-lg:hidden"
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
			<Flex align="center" className={cn('lg:p-0 lg:hidden', navbarPaddingForSize(size))}>
				<Button
					variant="bare"
					aria-label="Open navigation"
					prefix={menuIcon ?? <Icon icon={<Menu />} />}
					onClick={() => setOpen(true)}
				/>
				{navbar && <div className="min-w-0 flex-1">{navbar}</div>}
				{actions && <div className="flex items-center shrink-0 ml-auto">{actions}</div>}
			</Flex>

			{/* Content */}
			<SidebarLayoutContextProvider value={{ actions, size }}>
				<Frame direction="col" className={k.contentWrapper({ floating })}>
					<Frame direction="col" className={k.content({ size, stickyHeader })}>
						{children}
					</Frame>
				</Frame>
			</SidebarLayoutContextProvider>
		</Frame>
	)
}

type SidebarLayoutHeaderProps = PropsWithChildren<{ className?: string }>

export function SidebarLayoutHeader({ children, className }: SidebarLayoutHeaderProps) {
	const { actions, size } = useSidebarLayoutContext()

	return (
		<div data-slot="header" className={cn(k.header({ size }), className)}>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className="shrink-0 max-lg:hidden flex items-center">{actions}</div>}
		</div>
	)
}

type SidebarLayoutBodyProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLDivElement>
}>

export function SidebarLayoutBody({ ref, children, className }: SidebarLayoutBodyProps) {
	return (
		<div ref={ref} data-slot="body" className={cn(k.body(), className)}>
			{children}
		</div>
	)
}

type SidebarLayoutFooterProps = PropsWithChildren

export function SidebarLayoutFooter({ children }: SidebarLayoutFooterProps) {
	return (
		<div data-slot="footer" className={k.footer()}>
			{children}
		</div>
	)
}
