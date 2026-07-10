/**
 * Initial-render cost, side by side per scenario: one full
 * mount-to-painted-rows plus teardown per iteration. Every contender ingests
 * the same shipment dataset into the same fixed box; the iteration ends when
 * the first and a mid-viewport row are painted, so a library that defers row
 * DOM onto animation frames pays for the frames it defers.
 */

import { bench, describe } from 'vitest'
import { makeShipments, type Shipment } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, gridContenders, painted } from './grid-contenders'

const host = document.createElement('div')

host.style.width = `${GRID_WIDTH}px`

host.style.height = `${GRID_HEIGHT}px`

document.body.append(host)

/** The big scenarios see >100ms iterations; a longer window keeps samples up. */
const SLOW = { time: 2_000 }

/** The first and a mid-viewport row — evidence the visible window painted. */
function viewportMarkers(rows: Shipment[]): string[] {
	return [rows[0]?.id ?? '', rows[8]?.id ?? '']
}

function mountBenches(rows: Shipment[], options?: { time: number }) {
	const markers = viewportMarkers(rows)

	for (const contender of gridContenders()) {
		bench(
			contender.name,
			async () => {
				const grid = contender.mount(host, rows)

				await painted(host, markers)

				grid.destroy()
			},
			options,
		)
	}
}

const rows1k = makeShipments(1_000)

const rows10k = makeShipments(10_000)

const rows100k = makeShipments(100_000)

describe('grid mount · 1,000 rows × 8 cols', () => {
	mountBenches(rows1k)
})

describe('grid mount · 10,000 rows × 8 cols', () => {
	mountBenches(rows10k, SLOW)
})

describe('grid mount · 100,000 rows × 8 cols', () => {
	mountBenches(rows100k, SLOW)
})
