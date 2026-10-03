'use client'

import { Menu } from 'lucide-react'
import {
	type PropsWithChildren,
	type ReactNode,
	type Ref,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/button'
import { Drawer } from '../../components/drawer/drawer'
import { DrawerTrigger } from '../../components/drawer/slots'
import { Icon } from '../../components/icon'
import { Sheet } from '../../components/sheet/sheet'
import { cn, createContext } from '../../core'
import { useScrollWithin } from '../../hooks'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { useOffcanvas } from '../../hooks/use-offcanvas'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { Flex } from '../../structure/flex'
import { k } from './variants'

const [SidebarLayoutContext, useSidebarLayoutContext] = createContext<{
	actions?: ReactNode
}>('SidebarLayout', { default: {} })

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
	 * viewport widening to the `lg` breakpoint.
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
 * @remarks Below `lg`, the page scrolls, and the navbar is the one bar that sticks
 * to the top. The navbar is a region named "Navigation bar", which holds the menu
 * button, `navbar`, and `actions`. The header scrolls with the content. From `lg` up, the layout is
 * pinned to the viewport (`fixed inset-0`), and only the content region scrolls.
 * There, `stickyHeader` keeps the header at the top of the content region.
 * To show the layout inside another page, put it in a box that has a height and
 * layout containment, or the pinned layout covers the page.
 *
 * Its padding and the width of its desktop panel follow the nearest density
 * scope. The floating sheet has the width of the panel at each step. The
 * floating sidebar is non-modal, so its peek never steals focus or locks body
 * scroll, but `backdrop` still dims the page behind it.
 *
 * The sidebar sits on the start edge of the reading direction. In a
 * right-to-left page, the panel, the floating sheet, and its hover strip are
 * on the right.
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

	// Brings the current item into view when the drawer mounts its panel. A
	// stable callback, so that a render of the layout without the compiler does
	// not detach and attach the ref, and scroll again.
	const scrollToCurrent = useCallback(
		(node: HTMLDivElement | null) => {
			if (!node) return

			const current = node.querySelector<HTMLElement>('[data-current]')

			if (current) scrollWithin(current, { block: 'center' })
		},
		[scrollWithin],
	)

	// The floating sheet docks flush to the start edge. The sheet resolves `start`
	// itself, but its flush offset is a physical class, so it keys on the same read.
	const rtl = useIsRtl()

	const offcanvasValue = useMemo(() => ({ close }), [close])

	const layoutValue = useMemo(() => ({ actions }), [actions])

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
			{!floating && <div className={k.panel()}>{sidebar}</div>}

			{/* Sidebar on desktop: sheet when floating. Non-modal so the hover-revealed
			    peek doesn't steal focus or lock body scroll, but `backdrop` still
			    blurs and dims the page behind it. */}
			{floating && (
				<Sheet
					side="start"
					width="fit"
					open={floatingOpen}
					onOpenChange={setFloatingOpen}
					modal={false}
					backdrop
					className={cn(
						k.floatingSheet(),
						rtl ? 'sm:right-0 sm:rounded-r-none' : 'sm:left-0 sm:rounded-l-none',
					)}
				>
					<div
						className={k.floatingBody()}
						onPointerEnter={() => setFloatingOpen(true)}
						onPointerLeave={() => setFloatingOpen(false)}
					>
						{sidebar}
					</div>
				</Sheet>
			)}

			{/* Buffer beside the floating sidebar; keeps it open while the pointer lingers within 40px */}
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
					<div ref={scrollToCurrent} className="contents">
						{sidebar}
					</div>
				</OffcanvasContext>
			</Drawer>

			{/* Navbar on mobile. A named section, so the menu button, the navbar, and the
			    actions are in a landmark below `lg`. The section is the sticky bar, as a
			    sticky child sticks only inside the box of its parent. */}
			<section aria-label="Navigation bar" className={k.navbar()}>
				<Flex align="center">
					<DrawerTrigger open={open} onClick={() => setOpen(true)}>
						<Button
							type="button"
							variant="bare"
							aria-label="Open navigation"
							prefix={<Icon icon={<Menu />} />}
						/>
					</DrawerTrigger>
					{navbar && <div className="min-w-0 flex-1">{navbar}</div>}
					{actions && <div className="flex items-center shrink-0 ms-auto">{actions}</div>}
				</Flex>
			</section>

			{/* Content */}
			<SidebarLayoutContext value={layoutValue}>
				<div className={k.contentWrapper({ floating })}>
					<div className={k.content({ stickyHeader })}>{children}</div>
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
	const { actions } = useSidebarLayoutContext()

	return (
		<header ref={ref} data-slot="header" className={cn(k.header(), className)}>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className="shrink-0 max-lg:hidden flex items-center">{actions}</div>}
		</header>
	)
}

/** Props for {@link SidebarLayoutBody}; `ref` reaches the `<main>`. */
export type SidebarLayoutBodyProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

/**
 * Main content slot for {@link SidebarLayout} (`data-slot="body"`). From `lg` up,
 * it scrolls between the header and the footer. Below `lg`, it scrolls with the page.
 */
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
