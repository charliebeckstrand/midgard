/**
 * The cost of an extend of the cell range by key across 1,000 rows without a
 * window, so the fanout of the cursor store stays measured. Each sample
 * presses Shift with Ctrl+End or Ctrl+Home on the table. The range thus grows
 * from the first cell to the whole grid, or shrinks back to the first cell,
 * and each of the 8,000 cells flips its `data-in-range` flag. The sample ends
 * one rendered frame after the press, so the style and layout work that the
 * commit leaves to the browser is inside the sample. A frame costs about 17 ms
 * in the headless container (README), so a row reads that much above the work.
 *
 * The `fill handle` row is an editable grid, which also places the fill handle
 * on the active cell. The `read-only` row has no handle.
 */

import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, painted } from './grids'
import { frame, host, WINDOW } from './harness'

// A `field` makes each column editable, so the editable grid can fill.
const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	field: id,
	cell: (row) => String(row[id]),
}))

const noop = () => {}

/** Resolves after the next rendered frame: the style, layout, and paint of that frame are done. */
async function rendered(): Promise<void> {
	await frame()

	await new Promise<void>((resolve) => {
		const channel = new MessageChannel()

		channel.port1.onmessage = () => resolve()

		channel.port2.postMessage(null)
	})
}

/** Presses one key with Ctrl on the table, as the browser sends it. */
function press(table: HTMLElement, key: string, shiftKey: boolean): void {
	table.dispatchEvent(
		new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey, bubbles: true, cancelable: true }),
	)
}

/** One mounted grid: its report name, the seat of its cursor, and the timed extend. */
type Extend = { name: string; seat: () => Promise<void>; run: () => Promise<void> }

/**
 * Mounts one grid and closes it over an extend to the last cell and a shrink
 * back to the first. The seat focuses the table and moves the cursor to the
 * first cell with no range. It runs before the warmup of the bench, because
 * the mount of the next grid takes the focus. The sample throws if the cursor
 * is not on the row that the press gives, or if the last row is not in the
 * range after the extend.
 */
async function prepare(name: string, rows: Shipment[], grid: () => ReactNode): Promise<Extend> {
	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	const root = createRoot(box)

	flushSync(() => root.render(grid()))

	await painted(box, [rows[0]?.id ?? ''])

	const table = box.querySelector<HTMLElement>('table[role="grid"]')

	const first = box.querySelector('tbody tr:first-child')

	const last = box.querySelector('tbody tr:last-child')

	if (!table || !first || !last) throw new Error(`${name}: no grid to extend on`)

	const activeRow = () => box.querySelector('td[data-active]')?.closest('tr')

	let extended = false

	return {
		name,
		seat: async () => {
			table.focus()

			press(table, 'Home', false)

			await rendered()

			if (activeRow() !== first) throw new Error(`${name}: the cursor is not on the first row`)

			extended = false
		},
		run: async () => {
			extended = !extended

			press(table, extended ? 'End' : 'Home', true)

			await rendered()

			if (activeRow() !== (extended ? last : first)) {
				throw new Error(`${name}: the cursor is not on the ${extended ? 'last' : 'first'} row`)
			}

			const lastInRange = last.querySelector('td[data-in-range]') !== null

			if (lastInRange !== extended) {
				throw new Error(`${name}: the last row is ${extended ? 'not ' : ''}in the range`)
			}
		},
	}
}

const rows = shipments(1_000)

const extendsByKey = [
	await prepare('1,000 rows · fill handle', rows, () => (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			range
			editable={{ session: 'managed', scope: 'cell', onCommit: noop }}
		/>
	)),
	await prepare('1,000 rows · read-only', rows, () => (
		<Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} navigable range />
	)),
]

describe('grid range · extend to a corner by key · 1,000 rows · un-windowed', () => {
	for (const { name, seat, run } of extendsByKey) {
		bench(name, run, { ...WINDOW.slow, setup: seat })
	}
})
