import { describe, expect, it } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Outside-press across two *unrelated* floating surfaces (real floating engine).
 *
 * `isFloatingOutsidePress` spares a press that lands in another floating portal
 * unless that portal contains this panel's own reference — the ancestor test.
 * The intent is to spare a press in a nested DESCENDANT surface (a submenu, a
 * picker opened from inside a popover). But "not an ancestor" is not the same
 * predicate as "a descendant": a surface that is merely a sibling — neither
 * containing nor contained by this one — satisfies it too.
 *
 * That matters because portals here are flat, not nested. `PresencePortal`
 * passes an explicit `root` under a `<UIProvider>`, so every surface's portal is
 * a sibling `<div>` under one node and DOM ancestry carries no nesting
 * information at all. The reference-containment test is the sole discriminator.
 *
 * Two surfaces have to be open at once to reach it, and a pointer-driven open
 * would dismiss the first on its way in — so the second is opened through the
 * controlled `open` prop, which is public API.
 *
 * The jsdom suite mocks `@floating-ui/react` away, so only this project can
 * assert it.
 */
describe('outside press across sibling floating portals (real browser)', () => {
	it('dismisses a panel when the press lands in an unrelated sibling surface', async () => {
		renderUI(
			<div>
				<Popover>
					<PopoverTrigger>
						<button type="button">Open first</button>
					</PopoverTrigger>
					<PopoverContent aria-label="First">
						<p data-testid="first-body">First panel</p>
					</PopoverContent>
				</Popover>

				{/* Independent surface, held open so no pointer press opens it. */}
				<Popover open>
					<PopoverTrigger>
						<button type="button">Second trigger</button>
					</PopoverTrigger>
					<PopoverContent aria-label="Second">
						<p data-testid="second-body">Second panel</p>
					</PopoverContent>
				</Popover>
			</div>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Open first' }))

		await screen.findByTestId('first-body')

		const second = screen.getByTestId('second-body')

		const rect = second.getBoundingClientRect()

		// A press inside the second panel is outside the first, and the second is
		// no descendant of it — nothing about the first surface encloses it.
		fireEvent.pointerDown(second, {
			clientX: rect.left + 4,
			clientY: rect.top + 4,
			bubbles: true,
		})

		await waitFor(() => expect(screen.queryByTestId('first-body')).toBeNull())
	})

	it('still spares a press in a surface opened from inside the panel', async () => {
		renderUI(
			<Popover>
				<PopoverTrigger>
					<button type="button">Open outer</button>
				</PopoverTrigger>
				<PopoverContent aria-label="Outer">
					<p data-testid="outer-body">Outer panel</p>

					<Popover>
						<PopoverTrigger>
							<button type="button">Open inner</button>
						</PopoverTrigger>
						<PopoverContent aria-label="Inner">
							<p data-testid="inner-body">Inner panel</p>
						</PopoverContent>
					</Popover>
				</PopoverContent>
			</Popover>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Open outer' }))

		await screen.findByTestId('outer-body')

		fireEvent.click(screen.getByRole('button', { name: 'Open inner' }))

		await screen.findByTestId('inner-body')

		const inner = screen.getByTestId('inner-body')

		const rect = inner.getBoundingClientRect()

		fireEvent.pointerDown(inner, {
			clientX: rect.left + 4,
			clientY: rect.top + 4,
			bubbles: true,
		})

		// The inner surface opened from inside the outer panel, so the outer one
		// must survive a press within it. This is the case the predicate exists for
		// and any fix has to keep it.
		await waitFor(() => expect(screen.getByTestId('inner-body')).toBeInTheDocument())

		expect(screen.getByTestId('outer-body')).toBeInTheDocument()
	})
})
