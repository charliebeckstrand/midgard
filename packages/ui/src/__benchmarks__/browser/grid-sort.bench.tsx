/**
 * Whole-column sort cost on a live grid: each iteration flips an `id` sort
 * between ascending and descending through the library's own sort state —
 * the ui module and MUI X take a controlled sort model, AG its column-state
 * API — so the engine re-sorts the full dataset and repaints the window.
 * The zero-padded ids sort identically as strings everywhere, and the
 * iteration settles when the expected extreme rows paint at the top.
 */

import { bench, describe } from 'vitest'
import { makeShipments, type Shipment } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, gridContenders, painted } from './grid-contenders'

/** All scenarios see slow iterations; a longer window keeps samples up. */
const SLOW = { time: 2_000 }

type PreparedBench = { name: string; run: () => Promise<void> }

/** Mounts every contender and closes each over an asc/desc sort flip. */
async function prepare(rows: Shipment[]): Promise<PreparedBench[]> {
	const first = [rows[0]?.id ?? '', rows[8]?.id ?? '']

	const last = [rows[rows.length - 1]?.id ?? '', rows[rows.length - 9]?.id ?? '']

	const prepared: PreparedBench[] = []

	for (const contender of gridContenders()) {
		const host = document.createElement('div')

		host.style.width = `${GRID_WIDTH}px`

		host.style.height = `${GRID_HEIGHT}px`

		document.body.append(host)

		const grid = contender.mount(host, rows)

		await painted(host, first)

		let descending = false

		prepared.push({
			name: contender.name,
			run: async () => {
				descending = !descending

				grid.sort(descending ? 'desc' : 'asc')

				await painted(host, descending ? last : first)
			},
		})
	}

	return prepared
}

const rows10k = await prepare(makeShipments(10_000))

const rows100k = await prepare(makeShipments(100_000))

describe('grid sort · 10,000 rows · asc/desc flip', () => {
	for (const { name, run } of rows10k) {
		bench(name, run, SLOW)
	}
})

describe('grid sort · 100,000 rows · asc/desc flip', () => {
	for (const { name, run } of rows100k) {
		bench(name, run, SLOW)
	}
})
