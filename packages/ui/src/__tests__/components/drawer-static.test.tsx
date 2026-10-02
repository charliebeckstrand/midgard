import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Drawer, DrawerBody, DrawerStatic, DrawerTitle } from '../../components/drawer'
import { bySlot, getSlot, present, renderUI, screen } from '../helpers'

/** The class list of `el`, order-free — the two trees build theirs through different calls. */
function classes(el: Element | null | undefined, what: string): string[] {
	return [...present(el, what).classList].sort()
}

describe('DrawerStatic', () => {
	/*
	 * The whole reason it exists: the drawer's overlay portals, and `Portal` renders
	 * nothing without a `document`. The static drawer is plain markup in place, so a static render
	 * carries all of it — not asserted against the drawer here, because this suite's `document`
	 * is jsdom's, which the drawer would happily portal into.
	 */
	it('renders as static markup, content and all', () => {
		const html = renderToString(
			<DrawerStatic>
				<DrawerTitle>Resolve</DrawerTitle>
			</DrawerStatic>,
		)

		expect(html).toContain('data-slot="drawer-static"')
		expect(html).toContain('Resolve')
	})

	/*
	 * In step by construction, and pinned here so it stays that way: an open drawer that arrives
	 * in place lands exactly on its static copy, so any class one has and the other lacks is a jump
	 * on the frame the two swap.
	 */
	it('carries the same root, backdrop, and panel classes as an open drawer', () => {
		const { unmount } = renderUI(
			<Drawer
				open
				glass
				desaturate
				animateOnMount={false}
				onOpenChange={() => {}}
				className="h-40 ring-inset"
			>
				<DrawerTitle>Resolve</DrawerTitle>
			</Drawer>,
		)

		const root = classes(bySlot(document.body, 'overlay'), 'overlay root')
		const backdrop = classes(bySlot(document.body, 'overlay-backdrop'), 'backdrop')
		const panel = classes(bySlot(document.body, 'drawer'), 'panel')

		unmount()

		const { container } = renderUI(
			<DrawerStatic glass desaturate className="h-40 ring-inset">
				<DrawerTitle>Resolve</DrawerTitle>
			</DrawerStatic>,
		)

		const staticDrawer = getSlot(container, 'drawer-static')

		expect(classes(staticDrawer, 'static root')).toEqual(root)
		expect(classes(staticDrawer.children[0], 'static backdrop')).toEqual(backdrop)
		expect(classes(getSlot(staticDrawer, 'drawer-static-panel'), 'static panel')).toEqual(panel)
	})

	// A drawer with a handle lands on a static copy with the same grip and the same inset.
	it('paints the grip of a drawer with a handle', () => {
		const { unmount } = renderUI(
			<Drawer open handle animateOnMount={false} onOpenChange={() => {}}>
				<DrawerTitle>Resolve</DrawerTitle>
			</Drawer>,
		)

		const panel = getSlot(document.body, 'drawer')
		const grip = getSlot(panel, 'drawer-handle')
		const area = classes(grip, 'handle area')
		const bar = classes(grip.firstElementChild, 'handle bar')

		expect(panel).toHaveAttribute('data-handle')

		unmount()

		const { container } = renderUI(
			<DrawerStatic handle>
				<DrawerTitle>Resolve</DrawerTitle>
			</DrawerStatic>,
		)

		const staticPanel = getSlot(container, 'drawer-static-panel')
		const staticGrip = staticPanel.firstElementChild

		expect(staticPanel).toHaveAttribute('data-handle')
		expect(classes(staticGrip, 'static handle area')).toEqual(area)
		expect(classes(staticGrip?.firstElementChild, 'static handle bar')).toEqual(bar)
		expect(staticGrip).toHaveAttribute('aria-hidden', 'true')
	})

	it('resolves glass from the ambient provider, as the drawer does', () => {
		const { container } = renderUI(
			<DrawerStatic>
				<DrawerBody>body</DrawerBody>
			</DrawerStatic>,
			{ glass: true },
		)

		const flat = renderUI(
			<DrawerStatic>
				<DrawerBody>body</DrawerBody>
			</DrawerStatic>,
		).container

		const panelOf = (node: HTMLElement) => getSlot(node, 'drawer-static-panel').className

		expect(panelOf(container)).not.toBe(panelOf(flat))
	})

	// A picture of the drawer, not a second one: the real dialog brings its own name and focus.
	it('is no dialog, and nothing in it can be reached', () => {
		const { container } = renderUI(
			<DrawerStatic>
				<DrawerTitle>Resolve</DrawerTitle>
				<DrawerBody>
					<button type="button">Close</button>
				</DrawerBody>
			</DrawerStatic>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		const staticDrawer = getSlot(container, 'drawer-static')

		expect(getSlot(staticDrawer, 'drawer-static-panel')).toHaveAttribute('inert')

		// The root stays hit-testable, so a press cannot fall through to the page behind it.
		expect(staticDrawer).not.toHaveAttribute('inert')
	})

	it('puts root classes on the root, for hiding it where the drawer is not the surface', () => {
		const { container } = renderUI(
			<DrawerStatic rootClassName="lg:hidden">
				<DrawerBody>body</DrawerBody>
			</DrawerStatic>,
		)

		expect(getSlot(container, 'drawer-static')).toHaveClass('lg:hidden')
	})
})
