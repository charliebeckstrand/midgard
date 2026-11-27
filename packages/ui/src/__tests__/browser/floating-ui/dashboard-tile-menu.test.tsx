import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { renderUI } from '../../helpers'

/**
 * A pointer moves and resizes a dashboard tile with clicks only, from the menu
 * of the tile (WCAG 2.2 SC 2.5.7). It runs in a real browser, because a move
 * changes the reading order, and a real engine blurs an element that the DOM
 * moves. The menu button must keep the focus through the move.
 */

/** Two free-form tiles of one span, side by side. */
const START: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
	{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
]

function Board() {
	const [value, setValue] = useState(START)

	return (
		<div style={{ width: 384 }}>
			<Dashboard aria-label="Board" editing layout={{ value, onValueChange: setValue }}>
				<DashboardTile id="a" title="Revenue" minWidth={0} />

				<DashboardTile id="b" title="Traffic" minWidth={0} />
			</Dashboard>
		</div>
	)
}

/** The box of the tile `id` on the screen. */
function tileBox(id: string): DOMRect {
	const tile = document.querySelector(`[data-tile-id="${id}"]`)

	if (tile === null) throw new Error(`No tile ${id}`)

	return tile.getBoundingClientRect()
}

/** The column pitch of the board, in px. */
function pitch(): number {
	const canvas = document.querySelector<HTMLElement>('[data-slot="dashboard-canvas"]')

	if (canvas === null) throw new Error('No canvas')

	return canvas.clientWidth / 24
}

/** Opens the menu of "Revenue" with a click, and clicks its item `name`. */
async function step(name: string): Promise<void> {
	await userEvent.click(page.getByRole('button', { name: 'Arrange Revenue' }))

	await userEvent.click(page.getByRole('menuitem', { name }))
}

describe('the menu of a dashboard tile (real browser)', () => {
	it('moves a tile past its neighbor with clicks only, and keeps the focus on the button', async () => {
		renderUI(<Board />)

		const [a, b] = [tileBox('a').left, tileBox('b').left]

		await step('Move right')

		await expect.poll(() => tileBox('a').left).toBeCloseTo(b, 0)

		expect(tileBox('b').left).toBeCloseTo(a, 0)

		await expect.element(page.getByRole('button', { name: 'Arrange Revenue' })).toHaveFocus()
	})

	it('resizes a tile with clicks only', async () => {
		renderUI(<Board />)

		const before = tileBox('a')

		await step('Decrease width')

		await expect.poll(() => tileBox('a').width).toBeCloseTo(before.width - pitch(), 0)

		await step('Increase height')

		// Four rows make one column pitch.
		await expect.poll(() => tileBox('a').height).toBeCloseTo(before.height + pitch() / 4, 0)
	})
})
