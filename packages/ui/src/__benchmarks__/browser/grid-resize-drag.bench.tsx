/**
 * The cost of a drag-resize, move by move, on a windowed grid of 10,000 rows.
 * `grid-resize-truncation.bench.tsx` sets the width through the controlled
 * `columnSizing` binding. This scenario drives the real handle instead: a press
 * on the resize separator of `origin`, ten moves of 8px, and a release.
 *
 * The table engine throttles each move onto an animation frame. The sample runs
 * under {@link withFrameClock}, so each move gets one frame and no real wait.
 * After each frame, the sample reads the rect of the header cell. A real drag
 * shows the new width, so the read makes the browser lay out the grid.
 *
 * Paint is outside the sample. The number is the script cost of the drag plus
 * the layout that the reads force.
 *
 * The `truncate · script only` row does no layout read. It is the regression
 * sentinel for the script work alone, because the layout cost moves with the
 * browser.
 *
 * The ui grid runs alone, without a rival score. AG Grid and MUI X can drag a
 * column too. On equal terms, the fake clock must drive their frame services
 * also, and that is not verified.
 */

import { createRoot } from 'react-dom/client'
import { describe } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, painted } from './grid-contenders'
import { benches, host, mouse, type Prepared, WINDOW, withFrameClock } from './harness'

// Explicit `cell` renderers, as in `grid-resize-truncation.bench.tsx`, so the
// content paints synchronously and the truncating span still wraps it.
const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	cell: (row) => String(row[id]),
}))

/** The moves in one drag. */
const MOVES = 10

/** The distance of one move, in pixels. */
const STEP = 8

/** One variant: its report name, its `truncate` setting, and whether it reads layout. */
type Variant = { name: string; truncate: boolean; layout: boolean }

const VARIANTS: Variant[] = [
	{ name: 'truncate', truncate: true, layout: true },
	{ name: 'truncate={false}', truncate: false, layout: true },
	{ name: 'truncate · script only', truncate: true, layout: false },
]

/**
 * Mounts one windowed grid for each variant and closes each over one drag. The
 * direction of the drag alternates, so the width goes back to its start after
 * each pair of samples. Each closure runs twice before it registers, so the
 * first samples do not pay for the first drag.
 */
async function prepare(rows: Shipment[]): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const { name, truncate, layout } of VARIANTS) {
		const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

		createRoot(box).render(
			<Grid
				columns={COLUMNS}
				rows={rows}
				getKey={shipmentKey}
				virtualize
				maxHeight={`${GRID_HEIGHT}px`}
				resizable
				truncate={truncate}
			/>,
		)

		await painted(box, [rows[0]?.id ?? ''])

		const handle = box.querySelector<HTMLElement>('[role="separator"][aria-label="Resize Origin"]')

		const header = handle?.closest('th')

		if (!handle || !header) throw new Error(`${name}: no resize handle on the Origin header`)

		let direction = -1

		const run = () => {
			direction = -direction

			const before = Number(handle.getAttribute('aria-valuenow'))

			const rect = handle.getBoundingClientRect()

			const y = rect.top + rect.height / 2

			let x = rect.left + rect.width / 2

			withFrameClock((tick) => {
				mouse(handle, 'mousedown', x, y)

				for (let move = 0; move < MOVES; move++) {
					x += direction * STEP

					mouse(document, 'mousemove', x, y)

					tick()

					if (layout) header.getBoundingClientRect()
				}

				mouse(document, 'mouseup', x, y)

				tick()

				if (layout) header.getBoundingClientRect()
			})

			const moved = Number(handle.getAttribute('aria-valuenow')) - before

			if (moved !== direction * MOVES * STEP) {
				throw new Error(`${name}: the drag moved the width by ${moved}px`)
			}
		}

		run()

		run()

		prepared.push({ name, run })
	}

	return prepared
}

const rows10k = await prepare(shipments(10_000))

describe('grid resize · 10,000 rows · windowed · drag of 10 moves', () => {
	benches(rows10k, WINDOW.slow)
})
