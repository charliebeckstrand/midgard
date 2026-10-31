import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { frames, getSlot, renderUI, screen, userEvent, waitFor } from '../../helpers'
import { fadedEdges } from '../../helpers/scroll-fade'

/** Labels for more rows than any test viewport holds. */
const rows = Array.from({ length: 60 }, (_, index) => `Item ${index + 1}`)

/**
 * A menu taller than the viewport shrinks into the space on its side of the
 * trigger, and its viewport scrolls. The size middleware runs only in the real
 * floating engine, because the jsdom suite mocks `@floating-ui/react`.
 */
describe('a Menu taller than the viewport (real floating engine)', () => {
	const expectOnScreen = vi.defineHelper((element: Element) => {
		const rect = element.getBoundingClientRect()

		expect(rect.top).toBeGreaterThanOrEqual(0)

		expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight)
	})

	it('keeps a dropdown panel on screen and scrolls its rows', async () => {
		renderUI(
			<div style={{ paddingTop: window.innerHeight / 2 }}>
				<Menu placement="bottom-start" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						{rows.map((label) => (
							<MenuItem key={label}>{label}</MenuItem>
						))}
					</MenuContent>
				</Menu>
			</div>,
		)

		await frames(2)

		const panel = screen.getByRole('menu')

		expectOnScreen(panel)

		const viewport = getSlot(panel, 'menu-viewport')

		// The portaled panel overflows its cap, so its viewport fades the edge with
		// rows behind it.
		await waitFor(() => expect(fadedEdges(viewport)).toEqual({ top: false, bottom: true }))

		// The visible edge of the viewport cuts the last visible row at its middle.
		const edge = viewport.getBoundingClientRect().bottom

		const cut = screen
			.getAllByRole('menuitem')
			.map((row) => row.getBoundingClientRect())
			.find((rect) => rect.top < edge && rect.bottom > edge)

		expect(cut).toBeDefined()

		if (cut) expect(edge).toBeCloseTo(cut.top + cut.height / 2, 0)
	})

	it('keeps a submenu panel on screen', async () => {
		renderUI(
			<Menu placement="bottom-start" defaultOpen>
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>

				<MenuContent>
					<MenuSub label="More">
						{rows.map((label) => (
							<MenuItem key={label}>{label}</MenuItem>
						))}
					</MenuSub>
				</MenuContent>
			</Menu>,
		)

		await frames(2)

		await userEvent.click(screen.getByRole('menuitem', { name: /More/ }))

		await frames(2)

		// The submenu panel takes its name from the parent row.
		expectOnScreen(screen.getByRole('menu', { name: /More/ }))
	})
})
