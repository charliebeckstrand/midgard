import { describe, expect, it } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { renderUI, screen } from '../../helpers'
import { frame } from '../../helpers/frames'
import { drag } from '../helpers/drag'
import { sampleUntil } from '../helpers/sample'
import { budget } from '../helpers/wall-clock'

/**
 * Real-Motion check of the glide of a dashboard tile. The other suites mock
 * `motion`, and the mock records the call. A tile that a new layout moves glides
 * from its old cell over the later tiles, and then rests at `transform: none`
 * with no layer of its own.
 */
describe('dashboard tile glide (real Motion)', () => {
	const layout: DashboardLayoutItem[] = [
		{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
		{ id: 'b', x: 12, y: 0, w: 12, h: 10 },
	]

	const swapped: DashboardLayoutItem[] = [
		{ id: 'a', x: 12, y: 0, w: 12, h: 10 },
		{ id: 'b', x: 0, y: 0, w: 12, h: 10 },
	]

	function Board({ value, editing }: { value: DashboardLayoutItem[]; editing?: boolean }) {
		return (
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board" editing={editing} layout={{ value }}>
					<DashboardTile id="a" title="A" />

					<DashboardTile id="b" title="B" />
				</Dashboard>
			</div>
		)
	}

	it('glides a moved tile over the later tiles, and rests it at transform none', async () => {
		const { rerender } = renderUI(<Board value={layout} />)

		const [tile, partner] = [
			...document.querySelectorAll<HTMLElement>('[data-slot="dashboard-tile"]'),
		]

		if (!tile || !partner) throw new Error('expected two tiles')

		const rest = tile.getBoundingClientRect().left

		// Tile a takes the cell of tile b.
		const target = partner.getBoundingClientRect().left

		rerender(<Board value={swapped} />)

		await frame()

		// The first frame paints the tile at its old cell, on the glide layer.
		expect(tile.getBoundingClientRect().left).toBeLessThan((rest + target) / 2)

		expect(getComputedStyle(tile).zIndex).toBe('20')

		await sampleUntil(
			() => tile.style.transform,
			(transform) => transform === 'none',
			{ deadline: budget(3000) },
		)

		expect(tile).not.toHaveAttribute('data-gliding')

		expect(getComputedStyle(tile).zIndex).toBe('auto')

		expect(tile.getBoundingClientRect().left).toBeCloseTo(target, 0)
	})

	it('ends a glide at a pickup, and leaves no frame of it on the tile', async () => {
		const { rerender } = renderUI(<Board value={layout} editing />)

		const card = screen.getByRole('group', { name: 'A' })

		const tile = card.closest<HTMLElement>('[data-slot="dashboard-tile"]')

		if (!tile) throw new Error('expected the tile of a')

		rerender(<Board value={swapped} editing />)

		await frame()

		expect(tile).toHaveAttribute('data-gliding')

		// The pointer sensor lifts the tile after 3 px of travel.
		const held = await drag(screen.getByRole('button', { name: 'Move A' }), { x: 0, y: 0 }, [
			{ x: 10, y: 0 },
		])

		// The carry starts at the point of the pickup. No frame of the glide stays on
		// the tile, so the tile paints the carry alone, and not the glide offset.
		expect(tile).not.toHaveAttribute('data-gliding')

		expect(tile.getAnimations()).toEqual([])

		expect(tile.style.transform).toBe('translate3d(0px, 0px, 0px)')

		expect(new DOMMatrixReadOnly(getComputedStyle(tile).transform).m41).toBe(0)

		await held.release()
	})
})
