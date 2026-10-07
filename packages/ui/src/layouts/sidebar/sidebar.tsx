'use client'

import { Menu } from 'lucide-react'
import {
	type ComponentProps,
	type PropsWithChildren,
	type ReactNode,
	type Ref,
	use,
	useCallback,
	useMemo,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { defaultKeybindingsHandlerIgnore, type KeybindingFilter } from 'tinykeys'
import { Button } from '../../components/button'
import { Drawer, DrawerPanel } from '../../components/drawer/drawer'
import { DrawerTrigger } from '../../components/drawer/slots'
import { Icon } from '../../components/icon'
import { Sheet, SheetPanel } from '../../components/sheet/sheet'
import { cn, createContext, createSlot } from '../../core'
import { useScrollWithin } from '../../hooks'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { useKeybindings } from '../../hooks/use-keybindings'
import { useOffcanvas } from '../../hooks/use-offcanvas'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { readChoice, SIDEBAR, writeChoice } from '../../providers/appearance/appearance-storage'
import { useAppearanceChoice } from '../../providers/appearance/use-appearance-choice'
import { k } from '../../recipes/kata/sidebar-layout'
import { Flex } from '../../structure/flex'

const [SidebarLayoutContext] = createContext<{ actions?: ReactNode } | null>('SidebarLayout', {
	default: null,
})

/**
 * Tells whether the caller renders inside a {@link SidebarLayout}.
 * `AppearanceSettings` shows its Sidebar picker only there.
 *
 * @internal
 */
export function useInSidebarLayout() {
	return use(SidebarLayoutContext) !== null
}

// The filter of the shortcut. It skips a press that an earlier handler took, so
// that one press toggles the setting one time when a page nests a layout. The
// tinykeys default also skips the OS auto-repeat of a held chord, so a held key
// toggles the setting one time. It also skips a keydown during an IME
// composition and a press in a form field.
const IGNORE_TAKEN_OR_FIELD: KeybindingFilter = (event) =>
	event.defaultPrevented || defaultKeybindingsHandlerIgnore(event)

// Writes the other sidebar mode. The handler reads the stored choice, not a
// rendered value, so a press always toggles the current mode.
function toggleSidebar(event: KeyboardEvent) {
	event.preventDefault()

	writeChoice(SIDEBAR.key, readChoice(SIDEBAR) === 'offcanvas' ? 'locked' : 'offcanvas')
}

/** Props for {@link SidebarLayout}: the sidebar content and the slots beside it. */
export type SidebarLayoutProps = PropsWithChildren<{
	navbar?: ReactNode
	sidebar: ReactNode
	/**
	 * The actions in the navbar below `lg` and in the header from `lg` up. A gap
	 * that follows the nearest density scope separates them.
	 */
	actions?: ReactNode
	/** From `lg` up, keeps the header at the top of the content region. @defaultValue false */
	stickyHeader?: boolean
	/**
	 * Fires when the mobile navigation drawer opens or closes, whatever drove it. The
	 * drivers are the navbar button, a dismissal, a descendant calling `close`, or the
	 * viewport widening to the `lg` breakpoint.
	 *
	 * Observation only, and the mobile drawer alone. The desktop sidebar is inline, and
	 * the hover peek of the offcanvas sidebar is a pointer affordance rather than a
	 * disclosure, so neither reports here.
	 */
	onOpenChange?: (open: boolean) => void
}>

/**
 * App shell with a persistent sidebar: an inline desktop panel (or a
 * hover-revealed floating {@link Sheet} when the sidebar is offcanvas), and a
 * mobile {@link Drawer}. A content column hosts {@link SidebarLayoutHeader},
 * {@link SidebarLayoutBody}, and {@link SidebarLayoutFooter}.
 *
 * The Sidebar setting of `AppearanceProvider` selects the desktop sidebar:
 * `'locked'` shows the inline panel, and `'offcanvas'` shows the floating sheet.
 * The selection is a class on the root element, which `AppearanceScript` writes
 * before the first paint, so the first paint shows the correct sidebar. ⌘B
 * (Ctrl+B on other platforms) toggles the setting. A held chord toggles it one
 * time, and a press in a form field does not toggle it.
 *
 * @remarks The page scrolls at each width, so the scroll restoration of a router
 * resets and restores the position of the page. Below `lg`, the navbar is the one
 * bar that sticks to the top. The navbar is a region named "Navigation bar", which
 * holds the menu button, `navbar`, and `actions`. The header scrolls with the
 * content. From `lg` up, the desktop panel sticks to the top, has the height of
 * the viewport, and scrolls on its own. A scroll that reaches the end of the
 * panel stops there, and the page does not move. There, `stickyHeader` keeps the
 * header at the top of the page.
 *
 * To show the layout inside another page, put it in a box that has a height and
 * scrolls. Make the box a size container (`@container-size`). The layout then
 * fills the box, and the box scrolls in place of the page. The switch at `lg`
 * follows the width of the viewport, not the width of the box. Thus a narrow
 * box on a wide screen still shows the desktop panel.
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
	onOpenChange,
	children,
}: SidebarLayoutProps) {
	const { open, setOpen, close } = useOffcanvas({ onOpenChange })

	const [floatingOpen, setFloatingOpen] = useState(false)

	const [sidebarMode] = useAppearanceChoice(SIDEBAR)

	const [renderedMode, setRenderedMode] = useState(sidebarMode)

	// Resets the floating sheet to closed when the sidebar mode changes. The
	// sheet opens only from the hot zone, which shows only while offcanvas.
	if (renderedMode !== sidebarMode) {
		setRenderedMode(sidebarMode)

		setFloatingOpen(false)
	}

	useKeybindings({ '$mod+KeyB': toggleSidebar }, { ignore: IGNORE_TAKEN_OR_FIELD })

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
		<SidebarLayoutContext value={layoutValue}>
			<div className={k.base()}>
				{/* Hot zone to peek the floating sidebar. It shows only while offcanvas. */}
				<div
					aria-hidden
					className={k.floating.peek()}
					onPointerEnter={() => setFloatingOpen(true)}
				/>

				{/* Sidebar on desktop: inline when locked. It hides while offcanvas. */}
				<div className={k.panel()}>{sidebar}</div>

				{/* Sidebar on desktop: sheet when offcanvas. Non-modal so the hover-revealed
				    peek doesn't steal focus or lock body scroll, but `backdrop` still
				    blurs and dims the page behind it. */}
				<Sheet open={floatingOpen} onOpenChange={setFloatingOpen}>
					<SheetPanel
						side="start"
						width="fit"
						modal={false}
						backdrop
						// The peek closes when the pointer leaves, so it has no Close row.
						footer={null}
						className={cn(
							k.floating.sheet(),
							rtl ? 'sm:right-0 sm:rounded-r-none' : 'sm:left-0 sm:rounded-l-none',
						)}
					>
						<div
							className={k.floating.body()}
							onPointerEnter={() => setFloatingOpen(true)}
							onPointerLeave={() => setFloatingOpen(false)}
						>
							{sidebar}
						</div>
					</SheetPanel>
				</Sheet>

				{/* Buffer beside the floating sidebar; keeps it open while the pointer lingers within 40px */}
				{floatingOpen &&
					typeof document !== 'undefined' &&
					createPortal(
						<div
							aria-hidden
							className={k.floating.buffer()}
							onPointerEnter={() => setFloatingOpen(true)}
							onPointerLeave={() => setFloatingOpen(false)}
						/>,
						document.body,
					)}

				{/* Sidebar on mobile. The root holds the drawer and its trigger in the navbar. */}
				<Drawer open={open} onOpenChange={setOpen}>
					{/* A nav item and the close of `SidebarHeader` close the navigation, so it has no Close row. */}
					<DrawerPanel footer={null}>
						<OffcanvasContext value={offcanvasValue}>
							<div ref={scrollToCurrent} className="contents">
								{sidebar}
							</div>
						</OffcanvasContext>
					</DrawerPanel>

					{/* Navbar on mobile. A named section, so the menu button, the navbar, and the
					    actions are in a landmark below `lg`. The section is the sticky bar, as a
					    sticky child sticks only inside the box of its parent. */}
					<section aria-label="Navigation bar" className={k.navbar()}>
						<Flex align="center">
							<DrawerTrigger>
								<Button
									type="button"
									variant="bare"
									aria-label="Open navigation"
									prefix={<Icon icon={<Menu />} />}
								/>
							</DrawerTrigger>
							{navbar && <div className="min-w-0 flex-1">{navbar}</div>}
							{actions && <div className={cn(k.actions(), 'ms-auto')}>{actions}</div>}
						</Flex>
					</section>
				</Drawer>

				{/* Content */}
				<div className={k.content.wrapper()}>
					<div className={k.content.base({ stickyHeader })}>{children}</div>
				</div>
			</div>
		</SidebarLayoutContext>
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
	const actions = use(SidebarLayoutContext)?.actions

	return (
		<header ref={ref} data-slot="header" className={cn(k.header(), className)}>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className={cn(k.actions(), 'max-lg:hidden')}>{actions}</div>}
		</header>
	)
}

/** Props for {@link SidebarLayoutBody} (`<main>` attributes); `ref` reaches the `<main>`. */
export type SidebarLayoutBodyProps = ComponentProps<'main'>

/**
 * Main content slot for {@link SidebarLayout} (`data-slot="body"`). It scrolls
 * with the page at each width. It grows into the free height of the content
 * region, so the footer sits at the bottom of a short page.
 */
export const SidebarLayoutBody = createSlot('main', 'body', k.body())

/** Props for {@link SidebarLayoutFooter} (`<footer>` attributes). */
export type SidebarLayoutFooterProps = ComponentProps<'footer'>

/** Footer slot for {@link SidebarLayout} (`data-slot="footer"`). */
export const SidebarLayoutFooter = createSlot('footer', 'footer', k.footer())
