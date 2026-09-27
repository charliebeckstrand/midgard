/**
 * Initial-render cost: one full mount-to-painted-rows plus teardown per
 * iteration. The grid ingests the shipment dataset into a fixed box. The
 * iteration ends when the first and a mid-viewport row are painted, so a row
 * that the grid defers onto an animation frame costs the frames it defers.
 */

import { describe } from 'vitest'
import { shipments } from '../fixtures'
import { mountGridBenches } from './grid-harness'
import { WINDOW } from './harness'

describe('grid mount · 1,000 rows × 8 cols', () => {
	mountGridBenches(shipments(1_000))
})

describe('grid mount · 10,000 rows × 8 cols', () => {
	mountGridBenches(shipments(10_000), WINDOW.slow)
})

describe('grid mount · 100,000 rows × 8 cols', () => {
	mountGridBenches(shipments(100_000), WINDOW.slow)
})
