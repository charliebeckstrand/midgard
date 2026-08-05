import { type ReactNode, type RefObject, useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Drawer, DrawerBody } from '../../../components/drawer'
import { Overlay, type OverlayReach } from '../../../primitives/overlay'
import { noop, renderUI, screen, waitFor } from '../../helpers'

/**
 * `Overlay`'s `reachable` escape hatch (real floating engine). A modal surface
 * seals the page behind it, which strands a long-lived work surface inside
 * persistent app chrome: the chrome that raised the surface loses its tab stop,
 * so the only exit is to dismantle the surface (WCAG 2.1.1 / 2.4.3). A
 * declaration names the chrome and keeps it in the focus order, and leaves the
 * rest of the page sealed.
 *
 * Only this project can assert it. The jsdom suite and the sibling `browser`
 * project both mock `@floating-ui/react`, so no focus guard renders and nothing
 * marks the page; real Tab keystrokes are what engage or clear the trap.
 *
 * Each case starts with focus on `Panel first`, where the manager's default
 * `initialFocus` puts it, and walks out of the panel backwards. Backwards is
 * deliberate: the declared chrome precedes the portal in DOM order, so the walk
 * does not depend on how the engine wraps at the end of the document.
 */

const CHROME = '[data-test-chrome]'

/** The page behind the surface: declared chrome, then an undeclared sibling. @internal */
function Page({
	chromeRef,
	children,
}: {
	chromeRef?: RefObject<HTMLDivElement | null>
	children: ReactNode
}) {
	return (
		<>
			<div data-test-chrome ref={chromeRef}>
				<Button>Tab strip</Button>
			</div>
			<div>
				<Button>Sealed</Button>
			</div>
			{children}
		</>
	)
}

/** A modal overlay over {@link Page}, open on mount, with two tabbables in the panel. @internal */
function Surface({
	reachable,
	chromeRef,
}: {
	reachable?: OverlayReach | readonly OverlayReach[]
	chromeRef?: RefObject<HTMLDivElement | null>
}) {
	return (
		<Page chromeRef={chromeRef}>
			<Overlay open onOpenChange={noop} reachable={reachable}>
				<div>
					<Button>Panel first</Button>
					<Button>Panel last</Button>
				</div>
			</Overlay>
		</Page>
	)
}

/** {@link Surface}, with the declaration as a ref rather than a selector. @internal */
function RefSurface() {
	const chrome = useRef<HTMLDivElement>(null)

	return <Surface reachable={chrome} chromeRef={chrome} />
}

/**
 * The chrome's tab stop, by text rather than by role: an undeclared page is
 * marked away from AT, which empties the computed accessible name, and the
 * control cases query the same button on a page where that holds.
 */
function tabStrip(): HTMLElement {
	return screen.getByText('Tab strip').closest('button') as HTMLElement
}

function sealed(): HTMLElement {
	return screen.getByText('Sealed').closest('button') as HTMLElement
}

describe('a11y focus order (real browser): Overlay reachable', () => {
	it('lets Tab leave the panel for the declared chrome and come back', async () => {
		renderUI(<Surface reachable={CHROME} />)

		const first = screen.getByRole('button', { name: 'Panel first' })

		await waitFor(() => expect(first).toHaveFocus())

		// Backward out of the panel reaches the declared chrome, not the panel's
		// last tabbable — no guard is left to bounce it back inside.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(tabStrip()).toHaveFocus())

		// Forward from the chrome returns to the panel, skipping the sealed sibling
		// that sits between them in DOM order.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(first).toHaveFocus())

		expect(sealed()).not.toHaveFocus()

		// The whole walk left the surface up: focus moving to declared chrome is
		// not a focus-out dismissal.
		expect(screen.getByRole('button', { name: 'Panel last' })).toBeInTheDocument()
	})

	it('accepts a ref as well as a selector', async () => {
		renderUI(<RefSurface />)

		const first = screen.getByRole('button', { name: 'Panel first' })

		await waitFor(() => expect(first).toHaveFocus())

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(tabStrip()).toHaveFocus())
	})

	it('keeps the declared chrome live and seals the rest of the page', async () => {
		renderUI(<Surface reachable={CHROME} />)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		// Declared: no marking of either kind, so it holds its tab stop, its place
		// in the accessibility tree, and its pointer events (axe
		// `aria-hidden-focus`). A role query resolves it through that tree.
		const strip = screen.getByRole('button', { name: 'Tab strip' })

		expect(strip.closest('[inert]')).toBeNull()

		expect(strip.closest('[aria-hidden="true"]')).toBeNull()

		// Undeclared: `inert`, which is what holds the tab order off it with no
		// guard rendered — and which takes its pointer events with it.
		expect(sealed().closest('[inert]')).not.toBeNull()
	})

	it('forwards the declaration through Drawer', async () => {
		renderUI(
			<Page>
				<Drawer open onOpenChange={noop} reachable={CHROME} aria-label="Resolve">
					<DrawerBody>
						<Button>Panel first</Button>
						<Button>Panel last</Button>
					</DrawerBody>
				</Drawer>
			</Page>,
		)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(tabStrip()).toHaveFocus())

		expect(screen.getByRole('dialog', { name: 'Resolve' })).toBeInTheDocument()
	})

	// An empty array must land where an absent prop lands. It must not seal the
	// page with nothing exempt from the seal, which is the one input that could
	// take the exit away while asking for one.
	it.each([
		['no declaration', undefined],
		['an empty declaration', []],
	] as const)('traps by default, with %s', async (_label, reachable) => {
		renderUI(<Surface reachable={reachable} />)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		// The guard bounces backward Tab to the panel's own last tabbable.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel last' })).toHaveFocus())

		// The chrome stays marked away from AT, and nothing is inert.
		expect(tabStrip().closest('[aria-hidden="true"]')).not.toBeNull()

		expect(tabStrip().closest('[inert]')).toBeNull()
	})
})
