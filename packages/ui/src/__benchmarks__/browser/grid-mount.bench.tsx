/**
 * Initial-render cost: one full mount-to-painted-rows plus teardown per
 * iteration. The grid ingests the shipment dataset into a fixed box. The
 * iteration ends when the first and a mid-viewport row are painted, so a row
 * that the grid defers onto an animation frame costs the frames it defers.
 */

import { compareBenches } from '../compare'
import { shipments } from '../fixtures'
import { mountGridBenches } from './grid-harness'
import { WINDOW } from './harness'

compareBenches('grid mount · 1,000 rows × 8 cols', (bench) => {
	mountGridBenches(bench, shipments(1_000))
})

compareBenches(
	'grid mount · 10,000 rows × 8 cols',
	(bench) => {
		mountGridBenches(bench, shipments(10_000))
	},
	WINDOW.slow,
)

compareBenches(
	'grid mount · 100,000 rows × 8 cols',
	(bench) => {
		mountGridBenches(bench, shipments(100_000))
	},
	WINDOW.slow,
)
