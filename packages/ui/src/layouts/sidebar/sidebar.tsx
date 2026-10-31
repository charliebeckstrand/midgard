'use client'

import { Menu } from 'lucide-react'
import { useComposedRefs } from 'motion/react'
import {
	type ComponentProps,
	type PointerEvent,
	type ReactNode,
	use,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
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
import { OFFCANVAS_LAYOUT, type OffcanvasLayout, useOffcanvas } from '../../hooks/use-offcanvas'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Landmark } from '../../primitives/landmark'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { Portal } from '../../primitives/portal'
import { readChoice, SIDEBAR, writeChoice } from '../../providers/appearance/appearance-storage'
import { useAppearanceChoice } from '../../providers/appearance/use-appearance-choice'
import { k } from '../../recipes/kata/sidebar-layout'
import { Flex } from '../../structure/flex'
import type { Responsive } from '../../types'
import { type StickyBars, useStickyBars } from './use-sticky-bars'

const [SidebarLayoutContext] = createContext<{
	actions?: ReactNode
	bar?: StickyBars['bar']
	layout: Responsive<OffcanvasLayout>
	stickyHeader: boolean
} | null>('SidebarLayout', {
	default: null,
})

/**
 * The `layout` of the enclosing {@link SidebarLayout}, or `null` outside one.
 * A part that shows only beside the inline panel, such as the Sidebar picker
 * of `AppearanceSettings` or the Pin of the events, resolves its classes from
 * it, so it shows at the same breakpoints as the panel.
 *
 * @internal
 */
export function useSidebarLayoutPlacement(): Responsive<OffcanvasLayout> | null {
	return use(SidebarLayoutContext)?.layout ?? null
}

const messages = defineMessages({
	navigationBar: {
		id: 'ui.sidebarLayout.navigationBar',
		defaultMessage: 'Navigation bar',
		description:
			'The name of the bar at the top of a narrow page that holds the button that opens the navigation.',
	},
	openNavigation: {
		id: 'ui.sidebarLayout.openNavigation',
		defaultMessage: 'Open navigation',
		description: 'The name of the menu button that opens the navigation of a narrow page.',
	},
})

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

	writeChoice(SIDEBAR, readChoice(SIDEBAR) === 'offcanvas' ? 'locked' : 'offcanvas')
}

/**
 * Props for {@link SidebarLayout}: the sidebar content and the slots beside it.
 * The root `<div>` takes the rest.
 */
export type SidebarLayoutProps = ComponentProps<'div'> & {
	navbar?: ReactNode
	sidebar: ReactNode
	/**
	 * The actions in the navbar of the drawer layout and in the header of the
	 * inline layout. A gap that follows the nearest density scope separates them.
	 */
	actions?: ReactNode
	/**
	 * A panel on the end edge in the inline layout, such as the pinned panel of
	 * the events (`EventsAside`). It sticks to the top of the page, has the
	 * height of the viewport, and its content scrolls on its own, as the inline
	 * sidebar does. The content column narrows to give it room. In the drawer
	 * layout it does not show.
	 */
	aside?: ReactNode
	/** Keeps the header at the top of the content region in the inline layout. @defaultValue false */
	stickyHeader?: boolean
	/**
	 * Where the sidebar is: in a `drawer` that a navbar button opens, or
	 * `inline` beside the content. A per-breakpoint map sets the layout from
	 * each breakpoint, mobile-first. A single value sets it at each width.
	 * @defaultValue {@link OFFCANVAS_LAYOUT}
	 */
	layout?: Responsive<OffcanvasLayout>
	/**
	 * Fires when the navigation drawer opens or closes, whatever drove it. The
	 * drivers are the navbar button, a dismissal, a descendant calling `close`, or the
	 * viewport widening to the inline layout.
	 *
	 * Observation only, and the drawer alone. The inline sidebar does not open, and
	 * the hover peek of the offcanvas sidebar is a pointer affordance rather than a
	 * disclosure, so neither reports here.
	 */
	onOpenChange?: (open: boolean) => void
}

/**
 * App shell with a persistent sidebar: an inline panel (or a hover-revealed
 * floating {@link Sheet} when the sidebar is offcanvas), or a {@link Drawer}.
 * `layout` chooses between the two at each breakpoint: a drawer on a compact or
 * a medium viewport, and inline when expanded. A content column hosts {@link SidebarLayoutHeader},
 * {@link SidebarLayoutBody}, and {@link SidebarLayoutFooter}.
 *
 * The Sidebar setting of `AppearanceProvider` selects the inline sidebar:
 * `'locked'` shows the inline panel, and `'offcanvas'` shows the floating sheet.
 * The selection is a class on the root element, which `AppearanceScript` writes
 * before the first paint, so the first paint shows the correct sidebar. ⌘B
 * (Ctrl+B on other platforms) toggles the setting. A held chord toggles it one
 * time, and a press in a form field does not toggle it.
 *
 * @remarks The page scrolls at each width, so the scroll restoration of a router
 * resets and restores the position of the page. In the drawer layout, the navbar
 * is the one bar that sticks to the top. The navbar is a region named "Navigation
 * bar", which holds the menu button, `navbar`, and `actions`. Inside the main
 * landmark of another layout, the navbar is not a region. The header scrolls
 * with the content. In the inline layout, the panel sticks to the top, has the
 * height of the viewport, and scrolls on its own. A scroll that reaches the end of the
 * panel stops there, and the page does not move. There, `stickyHeader` keeps the
 * header at the top of the page.
 *
 * The layout sets the top `scroll-padding` of its scroller to the height of the
 * bar that sticks at the current width. A scroll into view, a jump to an
 * anchor, and the flight of a `Lightbox` photo then keep clear of the bar. The
 * padding is an inline style, so it wins over a `scroll-padding-top` that the
 * app sets on the same scroller.
 *
 * To show the layout inside another page, put it in a box that has a height and
 * scrolls. Make the box a size container (`@container-size`). The layout then
 * fills the box, and the box scrolls in place of the page. The breakpoints of
 * `layout` follow the width of the viewport, not the width of the box. Thus a
 * narrow box on a wide screen still shows the inline panel.
 *
 * Its padding and the width of its inline panel follow the nearest density
 * scope. The floating sheet has the width of the panel at each step. The
 * floating sidebar is non-modal, so its peek never steals focus or locks body
 * scroll, but `backdrop` still dims the page behind it. The sheet closes when
 * the layout at the viewport becomes the drawer.
 *
 * The sidebar sits on the start edge of the reading direction. In a
 * right-to-left page, the panel, the floating sheet, and its hover strip are
 * on the right. The `aside` sits on the end edge.
 *
 * In the document, the inline panel comes after the content, and its order
 * puts it on the start edge. A page that loads thus paints its content before
 * the parser reaches a long sidebar. A keyboard and a screen reader reach the
 * content first, and then the sidebar.
 */
export function SidebarLayout({
	navbar,
	sidebar,
	aside,
	actions,
	stickyHeader = false,
	layout: layoutProp = OFFCANVAS_LAYOUT,
	onOpenChange,
	className,
	children,
	ref,
	...props
}: SidebarLayoutProps) {
	const { open, setOpen, close, layout, inline } = useOffcanvas({
		layout: layoutProp,
		onOpenChange,
	})

	const slots = k({ layout })

	const intl = useIntl()

	const [floatingOpen, setFloatingOpen] = useState(false)

	const [mode] = useAppearanceChoice(SIDEBAR)

	const [prevMode, setPrevMode] = useState(mode)

	// Resets the floating sheet to closed when the sidebar mode changes. The
	// sheet opens only from the hot zone, which shows only while offcanvas.
	if (prevMode !== mode) {
		setPrevMode(mode)

		setFloatingOpen(false)
	}

	// The floating sheet is a part of the inline layout. A touch peek stays open
	// until a tap outside it, so the sheet also closes when the layout at the
	// viewport becomes the drawer, as when a tablet turns.
	if (floatingOpen && !inline) setFloatingOpen(false)

	useKeybindings({ '$mod+KeyB': toggleSidebar }, { ignore: IGNORE_TAKEN_OR_FIELD })

	// The peek closes when a hovering pointer leaves it. A finger fires
	// `pointerleave` as it lifts, so a touch peek stays open for the tap inside it,
	// and a tap outside the non-modal sheet closes it.
	const closeOnLeave = useCallback((event: PointerEvent) => {
		if (event.pointerType !== 'touch') setFloatingOpen(false)
	}, [])

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

	// biome-ignore lint/plugin/no-physical-side: these classes override the physical classes of the side that the sheet resolves
	const flush = rtl ? 'sm:right-0 sm:rounded-r-none' : 'sm:left-0 sm:rounded-l-none'

	const offcanvasValue = useMemo(() => ({ close }), [close])

	const { root: setStickyRoot, bar: setBar, measure } = useStickyBars()

	// The sticky bars read the root, so a consumer `ref` joins it.
	const setRoot = useComposedRefs<HTMLDivElement>(setStickyRoot, ref)

	// A change of `stickyHeader` makes the header stick or stop to stick at the
	// same size. No resize tells the bars about it, so the layout measures them
	// again. The mount needs no measure, as the refs measure as they attach.
	const measuredStickyRef = useRef(stickyHeader)

	useLayoutEffect(() => {
		if (measuredStickyRef.current === stickyHeader) return

		measuredStickyRef.current = stickyHeader

		measure()
	}, [measure, stickyHeader])

	const layoutValue = useMemo(
		() => ({ actions, bar: setBar, layout, stickyHeader }),
		[actions, setBar, layout, stickyHeader],
	)

	return (
		<SidebarLayoutContext value={layoutValue}>
			<div
				data-slot="sidebar-layout"
				{...props}
				ref={setRoot}
				className={cn(slots.base, className)}
			>
				{/* Hot zone to peek the floating sidebar. It shows only while offcanvas. */}
				<div
					aria-hidden
					className={slots.floating.peek}
					onPointerEnter={() => setFloatingOpen(true)}
				/>

				{/* Inline sidebar: sheet when offcanvas. Non-modal so the hover-revealed
				    peek doesn't steal focus or lock body scroll, but `backdrop` still
				    blurs and dims the page behind it. */}
				<Sheet open={floatingOpen} onOpenChange={setFloatingOpen}>
					<SheetPanel
						side="start"
						width="fit"
						modal={false}
						backdrop
						// The peek closes when the pointer leaves, or on a tap outside it, so it has
						// no Close row.
						footer={null}
						className={cn(slots.floating.sheet, flush)}
					>
						<div
							className={slots.floating.body}
							onPointerEnter={() => setFloatingOpen(true)}
							onPointerLeave={closeOnLeave}
						>
							{sidebar}
						</div>
					</SheetPanel>
				</Sheet>

				{/* Buffer beside the floating sidebar; keeps it open while the pointer lingers
				    within 40px. It goes through the same portal as the sheet, which carries the
				    density scope that sets the width of the sheet, so it starts at the far edge
				    of the sheet at each step. */}
				<Portal open={floatingOpen}>
					<div
						aria-hidden
						className={slots.floating.buffer}
						onPointerEnter={() => setFloatingOpen(true)}
						onPointerLeave={closeOnLeave}
					/>
				</Portal>

				{/* Drawer sidebar. The root holds the drawer and its trigger in the navbar. */}
				<Drawer open={open} onOpenChange={setOpen}>
					{/* A nav item and the close of `SidebarHeader` close the navigation, so it has no Close row. */}
					<DrawerPanel footer={null}>
						<OffcanvasContext value={offcanvasValue}>
							<div ref={scrollToCurrent} className="contents">
								{sidebar}
							</div>
						</OffcanvasContext>
					</DrawerPanel>

					{/* Navbar of the drawer layout. A named section, so the menu button, the
					    navbar, and the actions are in a landmark. Inside the main landmark of
					    another layout, they are in that landmark, and the section is not a
					    region (`Landmark`). The section is the sticky bar, as a sticky child
					    sticks only inside the box of its parent. */}
					<Landmark
						as="section"
						ref={setBar}
						aria-label={intl.formatMessage(messages.navigationBar)}
						className={slots.navbar}
					>
						<Flex align="center">
							<DrawerTrigger>
								<Button
									type="button"
									variant="bare"
									aria-label={intl.formatMessage(messages.openNavigation)}
									prefix={<Icon icon={<Menu />} />}
								/>
							</DrawerTrigger>
							{navbar && <div className="min-w-0 flex-1">{navbar}</div>}
							{actions && <div className={cn(slots.actions, 'ms-auto')}>{actions}</div>}
						</Flex>
					</Landmark>
				</Drawer>

				{/* Content */}
				<div className={slots.content.wrapper}>
					<div className={slots.content.base}>{children}</div>
				</div>

				{/* Inline sidebar when locked. It hides while offcanvas. It comes after the
				    content in the document, so a page that loads paints its content before
				    the parser reaches the sidebar. Its order puts it on the start edge. */}
				<div data-slot="sidebar-panel" className={slots.panel}>
					{sidebar}
				</div>

				{/* Inline aside: on the end edge, after the content. */}
				{aside && (
					<div data-slot="sidebar-aside" className={slots.aside}>
						{aside}
					</div>
				)}
			</div>
		</SidebarLayoutContext>
	)
}

/** Props for {@link SidebarLayoutHeader}. The `<header>` takes the rest. */
export type SidebarLayoutHeaderProps = ComponentProps<'header'>

/**
 * Header slot for {@link SidebarLayout} (`data-slot="header"`). Renders the
 * layout's `actions` alongside its children in the inline layout.
 */
export function SidebarLayoutHeader({
	ref,
	children,
	className,
	...props
}: SidebarLayoutHeaderProps) {
	const layout = use(SidebarLayoutContext)

	const actions = layout?.actions

	// The header joins the sticky bars, as it sticks in the inline layout with `stickyHeader`.
	const setHeader = useComposedRefs<HTMLElement>(layout?.bar, ref)

	// Outside a layout, the header takes the default layout.
	const placement = layout?.layout ?? OFFCANVAS_LAYOUT

	// The header reads `stickyHeader` from its own layout, so the header of a
	// nested layout keeps the prop of that layout.
	const sticky = layout?.stickyHeader ?? false

	const slots = k({ layout: placement, stickyHeader: sticky })

	return (
		<header
			{...props}
			ref={setHeader}
			data-slot="header"
			className={cn(slots.header.base, className)}
		>
			<div className="flex-1 min-w-0">{children}</div>
			{actions && <div className={slots.header.actions}>{actions}</div>}
		</header>
	)
}

/** Props for {@link SidebarLayoutBody} (`<main>` attributes); `ref` reaches the element that it renders. */
export type SidebarLayoutBodyProps = ComponentProps<'main'>

const bodyClass = k().body

/**
 * Main content slot for {@link SidebarLayout} (`data-slot="body"`). It scrolls
 * with the page at each width. It grows into the free height of the content
 * region, so the footer sits at the bottom of a short page. Inside the main
 * slot of another layout, it renders a `<div>`, so the page keeps one main
 * landmark.
 */
export function SidebarLayoutBody({ className, ...props }: SidebarLayoutBodyProps) {
	return <Landmark as="main" data-slot="body" className={cn(bodyClass, className)} {...props} />
}

/** Props for {@link SidebarLayoutFooter} (`<footer>` attributes). */
export type SidebarLayoutFooterProps = ComponentProps<'footer'>

/** Footer slot for {@link SidebarLayout} (`data-slot="footer"`). */
export const SidebarLayoutFooter = createSlot('footer', 'footer', k().footer)
