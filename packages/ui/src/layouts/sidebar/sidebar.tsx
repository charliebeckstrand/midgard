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
import type { Step } from '../../recipes'
import { k } from './variants'

const [SidebarLayoutContext, useSidebarLayoutContext] = createContext<{
	actions?: ReactNode
	space?: Step
}>('SidebarLayout', { default: {} })

/** Mobile navbar padding per step of the Density `space` axis. @internal */
const NAVBAR_PADDING = { sm: 'p-4', md: 'p-6', lg: 'p-8' } satisfies Record<Step, string>

/** Props for {@link SidebarLayout}: the sidebar content and the slots beside it. */
export type SidebarLayoutProps = PropsWithChildren<{
	navbar?: ReactNode
	sidebar: ReactNode
	actions?: ReactNode
	stickyHeader?: boolean
	floating?: boolean
	/**
	 * Fires when the mobile navigation drawer opens or closes, whatever drove it. The
	 * drivers are the navbar button, a dismissal, a descendant calling `close`, or the
	 * viewport widening past `--breakpoint-lg`.
	 *
	 * Observation only, and the mobile drawer alone. The desktop sidebar is inline, and
	 * the `floating` variant's hover peek is a pointer affordance rather than a
	 * disclosure, so neither reports here.
	 */
	onOpenChange?: (open: boolean) => void
}>

/**
 * App shell with a persistent sidebar: an inline desktop panel (or a
 * hover-revealed floating {@link Sheet} when `floating`), and a mobile
 * {@link Drawer}. A content column hosts {@link SidebarLayoutHeader},
 * {@link SidebarLayoutBody}, and {@link SidebarLayoutFooter}.
 *
 * @remarks Takes its padding from the ambient Density `space` axis. The
 * desktop panel holds text, so its width follows the `size` axis. The floating
 * sidebar is non-modal, so its peek never steals focus or locks body scroll,
 * but `backdrop` still dims the page behind it.
 */
export function SidebarLayout({
	navbar,
	sidebar,
	actions,
	stickyHeader,
	floating,
	onOpenChange,
	children,
}: SidebarLayoutProps) {
	const { open, setOpen, close } = useOffcanvas({ onOpenChange })

	const [floatingOpen, setFloatingOpen] = useState(false)

	// Resets the floating sheet to closed when `floating` flips off.
	useEffect(() => {
		if (!floating) setFloatingOpen(false)
	}, [floating])

	const scrollWithin = useScrollWithin()

	const { space, size } = useDensity()

	const offcanvasValue = useMemo(() => ({ close }), [close])

	const layoutValue = useMemo(() => ({ actions, space }), [actions, space])

	return (
		<div className={k.layout()}>
			{/* Hot zone to peek the floating sidebar */}
			{floating && (
				<div
					aria-hidden
					className={k.floatingHotZone()}
					onPointerEnter={() => setFloatingOpen(true)}
				/>
			)}

			{/* Sidebar on desktop: inline when locked */}
			{!floating && <div className={k.panel({ size })}>{sidebar}</div>}

			{/* Sidebar on desktop: sheet when floating. Non-modal so the hover-revealed
			    peek doesn't steal focus or lock body scroll, but `backdrop` still
			    blurs and dims the page behind it. */}
			{floating && (
				<Sheet
					side="left"
					width="xs"
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
						className={k.floatingBuffer()}
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
			<Flex align="center" className={cn('lg:p-0 lg:hidden', NAVBAR_PADDING[space])}>
				<Button
					type="button"
					variant="bare"
					aria-label="Open navigation"
					prefix={<Icon icon={<Menu />} />}
					onClick={() => setOpen(true)}
				/>
				{navbar && <div className="min-w-0 flex-1">{navbar}</div>}
				{actions && <div className="flex items-center shrink-0 ml-auto">{actions}</div>}
			</Flex>

			{/* Content */}
			<SidebarLayoutContext value={layoutValue}>
				<div className={k.contentWrapper({ floating })}>
					<div className={k.content({ density: space, stickyHeader })}>{children}</div>
				</div>
			</SidebarLayoutContext>
		</div>
	)
}

/** Props for {@link SidebarLayoutHeader}. */
export type SidebarLayoutHeaderProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

/**
 * Header slot for {@link SidebarLayout} (`data-slot="header"`). Renders the
 * layout's `actions` alongside its children on desktop.
 */
export function SidebarLayoutHeader({ ref, children, className }: SidebarLayoutHeaderProps) {
	const { actions, space } = useSidebarLayoutContext()

	return (
		<header ref={ref} data-slot="header" className={cn(k.header({ density: space }), className)}>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className="shrink-0 max-lg:hidden flex items-center">{actions}</div>}
		</header>
	)
}

/** Props for {@link SidebarLayoutBody}; `ref` reaches the scrolling `<main>`. */
export type SidebarLayoutBodyProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

/** Main content slot for {@link SidebarLayout} (`data-slot="body"`). */
export function SidebarLayoutBody({ ref, children, className }: SidebarLayoutBodyProps) {
	return (
		<main ref={ref} data-slot="body" className={cn(k.body(), className)}>
			{children}
		</main>
	)
}

/** Props for {@link SidebarLayoutFooter}. */
export type SidebarLayoutFooterProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

/** Footer slot for {@link SidebarLayout} (`data-slot="footer"`). */
export function SidebarLayoutFooter({ ref, children, className }: SidebarLayoutFooterProps) {
	return (
		<footer ref={ref} data-slot="footer" className={cn(k.footer(), className)}>
			{children}
		</footer>
	)
}
