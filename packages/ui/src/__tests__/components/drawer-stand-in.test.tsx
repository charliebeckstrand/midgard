import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Drawer, DrawerBody, DrawerStandIn, DrawerTitle } from '../../components/drawer'
import { bySlot, getSlot, present, renderUI, screen } from '../helpers'

/** The class list of `el`, order-free — the two trees build theirs through different calls. */
function classes(el: Element | null | undefined, what: string): string[] {
	return [...present(el, what).classList].sort()
}

describe('DrawerStandIn', () => {
	/*
	 * The whole reason it exists: the drawer's overlay portals, and `Portal` renders
	 * nothing without a `document`. The stand-in is plain markup in place, so a static render
	 * carries all of it — not asserted against the drawer here, because this suite's `document`
	 * is jsdom's, which the drawer would happily portal into.
	 */
	it('renders as static markup, content and all', () => {
		const html = renderToString(
			<DrawerStandIn>
				<DrawerTitle>Resolve</DrawerTitle>
			</DrawerStandIn>,
		)

		expect(html).toContain('data-slot="drawer-stand-in"')
		expect(html).toContain('Resolve')
	})

	/*
	 * In step by construction, and pinned here so it stays that way: an open drawer that arrives
	 * in place lands exactly on its stand-in, so any class one has and the other lacks is a jump
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
			<DrawerStandIn glass desaturate className="h-40 ring-inset">
				<DrawerTitle>Resolve</DrawerTitle>
			</DrawerStandIn>,
		)

		const standIn = getSlot(container, 'drawer-stand-in')

		expect(classes(standIn, 'stand-in root')).toEqual(root)
		expect(classes(standIn.children[0], 'stand-in backdrop')).toEqual(backdrop)
		expect(classes(getSlot(standIn, 'drawer-stand-in-panel'), 'stand-in panel')).toEqual(panel)
	})

	it('resolves glass from the ambient provider, as the drawer does', () => {
		const { container } = renderUI(
			<DrawerStandIn>
				<DrawerBody>body</DrawerBody>
			</DrawerStandIn>,
			{ glass: true },
		)

		const flat = renderUI(
			<DrawerStandIn>
				<DrawerBody>body</DrawerBody>
			</DrawerStandIn>,
		).container

		const panelOf = (node: HTMLElement) => getSlot(node, 'drawer-stand-in-panel').className

		expect(panelOf(container)).not.toBe(panelOf(flat))
	})

	// A picture of the drawer, not a second one: the real dialog brings its own name and focus.
	it('is no dialog, and nothing in it can be reached', () => {
		const { container } = renderUI(
			<DrawerStandIn>
				<DrawerTitle>Resolve</DrawerTitle>
				<DrawerBody>
					<button type="button">Close</button>
				</DrawerBody>
			</DrawerStandIn>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		const standIn = getSlot(container, 'drawer-stand-in')

		expect(getSlot(standIn, 'drawer-stand-in-panel')).toHaveAttribute('inert')

		// The root stays hit-testable, so a press cannot fall through to the page behind it.
		expect(standIn).not.toHaveAttribute('inert')
	})

	it('puts root classes on the root, for hiding it where the drawer is not the surface', () => {
		const { container } = renderUI(
			<DrawerStandIn rootClassName="lg:hidden">
				<DrawerBody>body</DrawerBody>
			</DrawerStandIn>,
		)

		expect(getSlot(container, 'drawer-stand-in')).toHaveClass('lg:hidden')
	})
})
