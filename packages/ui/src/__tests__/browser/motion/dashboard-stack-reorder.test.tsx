import { describe, expect, it, vi } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { readingOrder } from '../../../modules/dashboard/engine/dashboard-layout'
import { renderUI, screen } from '../../helpers'
import { drag } from '../helpers/drag'

/**
 * Real-layout check of a drag in the re-pack. The rows of the re-pack take the
 * height of their tiles, so only a real layout shows where each tile paints. The
 * dragged tile stays under the pointer, the other tiles glide, and the drop
 * saves the new reading order.
 */
describe('dashboard stack reorder (real layout, real Motion)', () => {
	// Three tiles of three heights. At 320 px each tile starves, so the board stacks them.
	const layout: DashboardLayoutItem[] = [
		{ id: 'a', x: 0, y: 0, w: 8, h: 8 },
		{ id: 'b', x: 8, y: 0, w: 8, h: 12 },
		{ id: 'c', x: 16, y: 0, w: 8, h: 4 },
	]

	it('keeps the dragged tile under the pointer, glides the others, and saves the order', async () => {
		const onValueChange = vi.fn()

		renderUI(
			<div style={{ width: 320 }}>
				<Dashboard aria-label="Board" editing layout={{ defaultValue: layout, onValueChange }}>
					<DashboardTile id="a" title="A" minWidth={280} />

					<DashboardTile id="b" title="B" minWidth={280} />

					<DashboardTile id="c" title="C" minWidth={280} />
				</Dashboard>
			</div>,
		)

		const tile = (id: string) => {
			const node = document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`)

			if (node === null) throw new Error(`expected the tile of ${id}`)

			return node
		}

		const top = (id: string) => tile(id).getBoundingClientRect().top

		// The stack paints a, b, c from the top.
		expect(top('a')).toBeLessThan(top('b'))

		expect(top('b')).toBeLessThan(top('c'))

		const start = top('c')

		const travel = top('a') - start

		// The pointer sensor lifts the tile after 3 px of travel. The center of tile c
		// then passes the start center of tile b, and ends on the start center of tile a.
		const held = await drag(screen.getByRole('button', { name: 'Move C' }), { x: 0, y: 0 }, [
			{ x: 0, y: -10 },
			{ x: 0, y: travel / 2 },
			{ x: 0, y: travel },
		])

		// Tile c takes the first shelf, and its carry keeps it under the pointer. The rows
		// can end on a fraction of a pixel.
		expect(Math.abs(top('c') - (start + travel))).toBeLessThan(1)

		const placeholder = document.querySelector('[data-slot="dashboard-placeholder"]')

		expect(placeholder?.getBoundingClientRect().top).toBeLessThan(top('a'))

		// Tiles a and b move down a shelf, and glide there.
		expect(tile('a')).toHaveAttribute('data-gliding')

		expect(tile('b')).toHaveAttribute('data-gliding')

		await held.release()

		expect(onValueChange).toHaveBeenCalledOnce()

		const saved: DashboardLayoutItem[] = onValueChange.mock.calls[0]?.[0] ?? []

		expect(readingOrder(saved)).toEqual(['c', 'a', 'b'])
	})
})
