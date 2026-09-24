import { describe, expect, it } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { renderUI, screen } from '../helpers'

/**
 * A real engine blurs an element that the DOM moves, and jsdom does not. The
 * reading order moves a tile in the DOM when the layout changes at rest. React
 * focuses a moved element again after the commit, and this suite holds the
 * board to it in a real engine.
 */
describe('dashboard reading order (real browser)', () => {
	const layout: DashboardLayoutItem[] = [
		{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
		{ id: 'b', x: 12, y: 0, w: 12, h: 10 },
	]

	const swapped: DashboardLayoutItem[] = [
		{ id: 'a', x: 12, y: 0, w: 12, h: 10 },
		{ id: 'b', x: 0, y: 0, w: 12, h: 10 },
	]

	function Board({ value }: { value: DashboardLayoutItem[] }) {
		return (
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board" layout={{ value }}>
					<DashboardTile id="a" title="A">
						<button type="button">Inside a</button>
					</DashboardTile>

					<DashboardTile id="b" title="B">
						<button type="button">Inside b</button>
					</DashboardTile>
				</Dashboard>
			</div>
		)
	}

	it('keeps the focus of a tile that the new order moves', () => {
		const { rerender } = renderUI(<Board value={layout} />)

		const inside = screen.getByRole('button', { name: 'Inside a' })

		inside.focus()

		// Tile a now reads second, so the DOM moves it after tile b.
		rerender(<Board value={swapped} />)

		const tiles = [...document.querySelectorAll('[data-slot="dashboard-tile"]')]

		expect(tiles.map((tile) => tile.textContent?.includes('Inside a'))).toEqual([false, true])

		expect(document.activeElement).toBe(inside)
	})
})
