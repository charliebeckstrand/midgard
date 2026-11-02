import { type ReactNode, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Drawer, DrawerBody, DrawerPanel } from '../../../components/drawer'
import { Overlay } from '../../../primitives/overlay'
import { noop, renderUI, screen, waitFor } from '../../helpers'

/**
 * A modal `Overlay` seals the box that it covers, against the real floating
 * engine. An overlay fixed to the viewport seals the page. An overlay in a
 * `container` seals only the container, so a work surface under a tab strip
 * keeps the tab strip reachable (WCAG 2.1.1 / 2.4.3). Before this rule, a
 * scoped overlay hid the whole page from the keyboard and from AT, but the
 * pointer still got to the page outside the container.
 *
 * Only this project can assert it. The jsdom suite and the sibling `browser`
 * project both mock `@floating-ui/react`, so no focus guard renders and nothing
 * marks the page. Real Tab keystrokes engage or clear the trap.
 *
 * Each case starts with the focus on `Panel first` and walks out of the panel
 * backwards. The tab strip comes before the container in DOM order, so the
 * walk does not depend on how the engine wraps at the end of the document.
 */

/** The page: a tab strip, then the work area with content that a surface can cover. @internal */
function Page({ surface }: { surface: (box: HTMLDivElement) => ReactNode }) {
	const [box, setBox] = useState<HTMLDivElement | null>(null)

	const [presses, setPresses] = useState(0)

	return (
		<>
			<div>
				<Button onClick={() => setPresses((count) => count + 1)}>Tab strip {presses}</Button>
			</div>
			<div ref={setBox} className="relative h-64 w-96">
				<Button>Covered</Button>
				{box && surface(box)}
			</div>
		</>
	)
}

/** A modal overlay with two tabbables, in `box` when `scoped`, else fixed to the viewport. @internal */
function Surface({ scoped }: { scoped: boolean }) {
	return (
		<Page
			surface={(box) => (
				<Overlay open onOpenChange={noop} container={scoped ? box : undefined}>
					<div>
						<Button>Panel first</Button>
						<Button>Panel last</Button>
					</div>
				</Overlay>
			)}
		/>
	)
}

/**
 * The tab strip, by text rather than by role: a sealed page is marked away
 * from AT, which empties the computed accessible name.
 */
function tabStrip(): HTMLElement {
	return screen.getByText(/^Tab strip/).closest('button') as HTMLElement
}

function covered(): HTMLElement {
	return screen.getByText('Covered').closest('button') as HTMLElement
}

describe('a11y focus order (real browser): Overlay seals the box that it covers', () => {
	it('seals the whole page from an overlay fixed to the viewport', async () => {
		renderUI(<Surface scoped={false} />)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		// The guard bounces a backward Tab to the last tabbable of the panel.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel last' })).toHaveFocus())

		expect(tabStrip().closest('[aria-hidden="true"]')).not.toBeNull()

		expect(covered().closest('[aria-hidden="true"]')).not.toBeNull()
	})

	it('seals only the container of a scoped overlay', async () => {
		renderUI(<Surface scoped />)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		// The page outside the container keeps its place in the accessibility
		// tree and its pointer events. A role query resolves it through that tree.
		const strip = screen.getByRole('button', { name: 'Tab strip 0' })

		expect(strip.closest('[inert]')).toBeNull()

		expect(strip.closest('[aria-hidden="true"]')).toBeNull()

		// The covered content is `inert`. That holds the tab order off it with
		// no guard, and takes its pointer events.
		expect(covered().closest('[inert]')).not.toBeNull()

		await userEvent.click(strip)

		expect(strip).toHaveTextContent('Tab strip 1')
	})

	it('lets Tab leave a scoped overlay for the page and come back', async () => {
		renderUI(<Surface scoped />)

		const first = screen.getByRole('button', { name: 'Panel first' })

		await waitFor(() => expect(first).toHaveFocus())

		// Backward out of the panel skips the covered content and reaches the tab
		// strip. No guard is left to bounce it back inside.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(tabStrip()).toHaveFocus())

		// Forward from the tab strip skips the covered content and returns to the panel.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(first).toHaveFocus())

		// The walk left the surface open. A move of the focus to the page does
		// not dismiss it.
		expect(screen.getByRole('button', { name: 'Panel last' })).toBeInTheDocument()
	})

	// A maximized drawer under a tab strip: the Drawer takes the work area as
	// its container, and no other prop.
	it('keeps the tab strip reachable from a Drawer in the work area', async () => {
		renderUI(
			<Page
				surface={(box) => (
					<Drawer open onOpenChange={noop}>
						<DrawerPanel aria-label="Resolve" container={box}>
							<DrawerBody>
								<Button>Panel first</Button>
								<Button>Panel last</Button>
							</DrawerBody>
						</DrawerPanel>
					</Drawer>
				)}
			/>,
		)

		await waitFor(() => expect(screen.getByRole('button', { name: 'Panel first' })).toHaveFocus())

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(tabStrip()).toHaveFocus())

		expect(screen.getByRole('dialog', { name: 'Resolve' })).toBeInTheDocument()
	})
})
