import { describe, expect, it, onTestFinished } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { getSlot, renderUI, screen } from '../../helpers'

/**
 * A board in a scroll box with a classic scrollbar holds one state at the
 * threshold of its projection. The saved layout overflows the box, and the
 * projection fits it, so the scrollbar comes and goes with the projection. The
 * scrollbar takes 15 px of the width, and the threshold is inside that band.
 * With no hold, the board switched between the two states on each frame.
 *
 * The case runs with real scrollbars (the `scrollbars` instance of
 * `vitest.browser.config.ts`). With hidden scrollbars, the width of the board
 * does not depend on its height, so no loop can start.
 */
describe('dashboard projection at a classic scrollbar (real browser, real scrollbars)', () => {
	// Tile b starts 30 rows under tile a, so the saved board is 50 rows tall. The
	// projection stacks the two tiles, and it is 20 rows tall.
	const LAYOUT: DashboardLayoutItem[] = [
		{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
		{ id: 'b', x: 12, y: 40, w: 12, h: 10 },
	]

	it('holds one state in a box 7 px wider than the threshold', async () => {
		// Tile a starves under 300 px. The box is 307 px wide, and 292 px with the scrollbar.
		renderUI(
			<div style={{ width: 307, height: 120, overflowX: 'hidden', overflowY: 'auto' }}>
				<Dashboard aria-label="Board" editing gap={0} layout={{ defaultValue: LAYOUT }}>
					<DashboardTile id="a" title="A" minWidth={150} />

					<DashboardTile id="b" title="B" minWidth={0} />
				</Dashboard>
			</div>,
		)

		const board = screen.getByRole('region', { name: 'Board' })

		const tile = getSlot(board, 'dashboard-tile')

		const read = () =>
			`${board.hasAttribute('data-editing') ? 'saved' : 'projected'} ${Math.round(tile.getBoundingClientRect().width)}`

		// The first frames measure the canvas and settle it.
		for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame)

		let loops = 0

		const count = (event: ErrorEvent) => {
			if (event.message.includes('ResizeObserver loop')) loops += 1
		}

		window.addEventListener('error', count)

		onTestFinished(() => window.removeEventListener('error', count))

		// One sample for each frame. A loop through the ResizeObserver can switch on
		// each frame, and a sample on each second frame reads it at one phase.
		const seen: string[] = []

		for (let frame = 0; frame < 36; frame++) {
			await new Promise(requestAnimationFrame)

			seen.push(read())
		}

		window.removeEventListener('error', count)

		// The board holds the projection at the full width of the box, with no scrollbar.
		expect(seen).toEqual(Array.from({ length: 36 }, () => 'projected 307'))

		expect(loops).toBe(0)
	})
})
