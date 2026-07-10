/**
 * Data-refresh cost on a live grid — the polling dashboard path. Each
 * scenario mounts every contender once (top-level await; the grids stay up
 * for the whole run) and each iteration swaps in the other of two same-id
 * datasets, so every refresh moves real cell values through stable row
 * identities and never bails on an equality guard. The ui module and MUI X
 * re-render through their React roots; AG takes `setGridOption('rowData')`.
 * The iteration settles when the incoming dataset's reference cells paint.
 */

import { bench, describe } from 'vitest'
import { makeShipments, type Shipment } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, gridContenders, painted } from './grid-contenders'

/** All scenarios see slow iterations; a longer window keeps samples up. */
const SLOW = { time: 2_000 }

type PreparedBench = { name: string; run: () => Promise<void> }

/** Mounts every contender on dataset `a` and closes each over an a/b swap. */
async function prepare(a: Shipment[], b: Shipment[]): Promise<PreparedBench[]> {
	const prepared: PreparedBench[] = []

	for (const contender of gridContenders()) {
		const host = document.createElement('div')

		host.style.width = `${GRID_WIDTH}px`

		host.style.height = `${GRID_HEIGHT}px`

		document.body.append(host)

		const grid = contender.mount(host, a)

		await painted(host, [a[0]?.id ?? ''])

		let flip = false

		prepared.push({
			name: contender.name,
			run: async () => {
				flip = !flip

				const next = flip ? b : a

				grid.update(next)

				await painted(host, [next[0]?.reference ?? '', next[8]?.reference ?? ''])

				// Yield one real frame per refresh, the way a polling dashboard paints
				// between updates. A synchronous contender (the ui module's `flushSync`
				// commit, MUI's render) otherwise settles in zero frames, so many
				// iterations chain in one tick with no yield — React counts those as
				// nested updates and trips its depth guard on the ui grid's benign
				// post-commit re-render. The frame is near-free with the frame-rate
				// limit off (see the bench config) and lands on every contender alike.
				await new Promise(requestAnimationFrame)
			},
		})
	}

	return prepared
}

const rows10k = await prepare(makeShipments(10_000, 1), makeShipments(10_000, 2))

const rows100k = await prepare(makeShipments(100_000, 1), makeShipments(100_000, 2))

describe('grid update · 10,000 rows × 8 cols', () => {
	for (const { name, run } of rows10k) {
		bench(name, run, SLOW)
	}
})

describe('grid update · 100,000 rows × 8 cols', () => {
	for (const { name, run } of rows100k) {
		bench(name, run, SLOW)
	}
})
