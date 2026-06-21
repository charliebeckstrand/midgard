'use client'

import { Menu } from 'lucide-react'
import {
	type PropsWithChildren,
	type ReactNode,
	type Ref,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/button'
import { Drawer } from '../../components/drawer/drawer'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Sheet } from '../../components/sheet/sheet'
import { cn, createContext } from '../../core'
import { useScrollWithin } from '../../hooks'
import { useOffcanvas } from '../../hooks/use-offcanvas'
import { useDensity } from '../../primitives/density'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { k } from './variants'

const [SidebarLayoutContext, useSidebarLayoutContext] = createContext<{
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

	// Resets the floating sheet to closed when `floating` flips off.
	useEffect(() => {
		if (!floating) setFloatingOpen(false)
	}, [floating])

	const scrollWithin = useScrollWithin()

	const { size } = useDensity()

	const offcanvasValue = useMemo(() => ({ close }), [close])

	const layoutValue = useMemo(() => ({ actions, size }), [actions, size])

	return (
		<div className={k.layout()}>
			{/* Hot zone to peek the floating sidebar */}
			{floating && (
				<div
					aria-hidden
					className={cn(k.floatingHotZone())}
					onPointerEnter={() => setFloatingOpen(true)}
				/>
			)}

			{/* Sidebar on desktop: inline when locked */}
			{!floating && <div className={cn(k.panel({ size }), panelClassName)}>{sidebar}</div>}

			{/* Sidebar on desktop: sheet when floating. Non-modal so the hover-revealed
			    peek doesn't steal focus or lock body scroll, but `backdrop` still
			    blurs and dims the page behind it. */}
			{floating && (
				<Sheet
					side="left"
					size="xs"
					open={floatingOpen}
					onOpenChange={setFloatingOpen}
					modal={false}
					backdrop
					className="sm:top-0 sm:left-0 sm:bottom-0 sm:rounded-l-none"
				>
					<div
						className="flex flex-col h-full"
						onPointerEnter={() => setFloatingOpen(true)}
						onPointerLeave={() => setFloatingOpen(false)}
					>
						{sidebar}
					</div>
				</Sheet>
			)}

			{/* Buffer to the right of the floating sidebar; keeps it open while the pointer lingers within 40px */}
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
				<OffcanvasContext value={offcanvasValue}>
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
				</OffcanvasContext>
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
			<SidebarLayoutContext value={layoutValue}>
				<div className={k.contentWrapper({ floating })}>
					<div className={k.content({ size, stickyHeader })}>{children}</div>
				</div>
			</SidebarLayoutContext>
		</div>
	)
}

type SidebarLayoutHeaderProps = PropsWithChildren<{ className?: string }>

export function SidebarLayoutHeader({ children, className }: SidebarLayoutHeaderProps) {
	const { actions, size } = useSidebarLayoutContext()

	return (
		<header data-slot="header" className={cn(k.header({ size }), className)}>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className="shrink-0 max-lg:hidden flex items-center">{actions}</div>}
		</header>
	)
}

type SidebarLayoutBodyProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

export function SidebarLayoutBody({ ref, children, className }: SidebarLayoutBodyProps) {
	return (
		<main ref={ref} data-slot="body" className={cn(k.body(), className)}>
			{children}
		</main>
	)
}

type SidebarLayoutFooterProps = PropsWithChildren

export function SidebarLayoutFooter({ children }: SidebarLayoutFooterProps) {
	return (
		<footer data-slot="footer" className={k.footer()}>
			{children}
		</footer>
	)
}
