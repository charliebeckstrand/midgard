import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Drawer, DrawerBody } from '../../../components/drawer'
import { PersistentChrome } from '../../../primitives/chrome'
import { Overlay } from '../../../primitives/overlay'
import { noop, renderUI, screen, waitFor } from '../../helpers'

/**
 * `PersistentChrome` against the real floating engine. A modal surface seals the
 * page behind it, which strands a long-lived work surface inside persistent app
 * chrome: the chrome that raised the surface loses its tab stop, so the only exit
 * is to dismantle the surface (WCAG 2.1.1 / 2.4.3). A registered region keeps its
 * tab stop, and leaves the rest of the page sealed.
 *
 * Only this project can assert it. The jsdom suite and the sibling `browser`
 * project both mock `@floating-ui/react`, so no focus guard renders and nothing
 * marks the page; real Tab keystrokes are what engage or clear the trap.
 *
 * Each case starts with focus on `Panel first`, where the manager's default
 * `initialFocus` puts it, and walks out of the panel backwards. Backwards is
 * deliberate: the region precedes the portal in DOM order, so the walk does not
 * depend on how the engine wraps at the end of the document.
 */

/** The page behind the surface: a chrome region, then an ordinary sibling. @internal */
function Page({ chrome = true, children }: { chrome?: boolean; children: ReactNode }) {
	const strip = <Button>Tab strip</Button>

	return (
		<>
			{chrome ? <PersistentChrome>{strip}</PersistentChrome> : <div>{strip}</div>}
			<div>
				<Button>Sealed</Button>
			</div>
			{children}
		</>
	)
}

/** A modal overlay over {@link Page}, open on mount, with two tabbables in the panel. @internal */
function Surface({ chrome }: { chrome?: boolean }) {
	return (
		<Page chrome={chrome}>
			<Overlay open onOpenChange={noop}>
				<div>
					<Button>Panel first</Button>
					<Button>Panel last</Button>
				</div>
			</Overlay>
		</Page>
	)
}

/**
 * The chrome's tab stop, by text rather than by role: a page with no region is
 * marked away from AT, which empties the computed accessible name, and the
 * control case queries the same button on a page where that holds.
 */
function tabStrip(): HTMLElement {
	return screen.getByText('Tab strip').closest('button') as HTMLElement
}

function sealed(): HTMLElement {
	return screen.getByText('Sealed').closest('button') as HTMLElement
}

describe('a11y focus order (real browser): PersistentChrome', () => {
	it('lets Tab leave the panel for the region and come back', async () => {
		renderUI(<Surface />)

		const first = screen.getByRole('button', { name: 'Panel first' })

		await waitFor(() => expect(first).toHaveFocus())

		// Backward out of the panel reaches the region, not the panel's last
		// tabbable — no guard is left to bounce it back inside.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(tabStrip()).toHaveFocus())

		// Forward from the region returns to the panel, skipping the sealed sibling
		// that sits between them in DOM order.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(first).toHaveFocus())

		expect(sealed()).not.toHaveFocus()

		// The whole walk left the surface up: focus moving to the region is not a
		// focus-out dismissal.
		expect(screen.getByRole('button', { name: 'Panel last' })).toBeInTheDocument()
	})

	it('keeps the region live and seals the rest of the page', async () => {
		renderUI(<Surface />)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		// Registered: no marking of either kind, so it holds its tab stop, its place
		// in the accessibility tree, and its pointer events (axe `aria-hidden-focus`).
		// A role query resolves it through that tree.
		const strip = screen.getByRole('button', { name: 'Tab strip' })

		expect(strip.closest('[inert]')).toBeNull()

		expect(strip.closest('[aria-hidden="true"]')).toBeNull()

		// Unregistered: `inert`, which is what holds the tab order off it with no
		// guard rendered — and which takes its pointer events with it.
		expect(sealed().closest('[inert]')).not.toBeNull()
	})

	// The drawer is asked for nothing. A surface does not opt in to honouring a
	// region, which is the whole point of registering it at the region instead.
	it('honours the region through Drawer, with no prop passed', async () => {
		renderUI(
			<Page>
				<Drawer open onOpenChange={noop} aria-label="Resolve">
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

	it('traps by default, with no region on the page', async () => {
		renderUI(<Surface chrome={false} />)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		// The guard bounces backward Tab to the panel's own last tabbable.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel last' })).toHaveFocus())

		// The page stays marked away from AT, and nothing is inert.
		expect(tabStrip().closest('[aria-hidden="true"]')).not.toBeNull()

		expect(tabStrip().closest('[inert]')).toBeNull()
	})
})
