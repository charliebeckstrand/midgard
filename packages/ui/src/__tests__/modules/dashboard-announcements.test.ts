// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	describeDragCancel,
	describeDragEnd,
	describeDragMove,
	describeDragStart,
} from '../../modules/dashboard/engine/dashboard-announcements'
import type { DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'

/** A tile at the third column of the second row, eight columns wide. */
const CELL: DashboardCell = { id: 'a', x: 2, y: 1, w: 8, h: 10, static: false }

describe('describeDragStart', () => {
	it('names the tile, its cell, and the keys', () => {
		expect(describeDragStart('Revenue', CELL, 24)).toBe(
			'Picked up Revenue at column 3 of 24, row 2, 8 columns wide. Use the arrow keys to move it. Press Space to drop it, or Escape to cancel.',
		)
	})
})

describe('describeDragMove', () => {
	it('says that a drop changes nothing when the preview has no cell or no change', () => {
		const blocked = 'Revenue cannot go here. A drop now changes nothing.'

		expect(describeDragMove('Revenue', null, 24, null, null)).toBe(blocked)

		expect(describeDragMove('Revenue', null, 24, 'move', null)).toBe(blocked)

		expect(describeDragMove('Revenue', CELL, 24, null, null)).toBe(blocked)
	})

	it('names the partner of a swap', () => {
		expect(describeDragMove('Revenue', CELL, 24, 'swap', 'Orders')).toBe(
			'Revenue swaps with Orders, to column 3 of 24, row 2, 8 columns wide.',
		)
	})

	it('names the partner of a shift', () => {
		expect(describeDragMove('Revenue', CELL, 24, 'shift', 'Traffic')).toBe(
			'Revenue moves before or after Traffic, to column 3 of 24, row 2, 8 columns wide.',
		)
	})

	it('names only the cell of a move, or of a reorder with no partner', () => {
		const moved = 'Revenue moves to column 3 of 24, row 2, 8 columns wide.'

		expect(describeDragMove('Revenue', CELL, 24, 'move', null)).toBe(moved)

		expect(describeDragMove('Revenue', CELL, 24, 'swap', null)).toBe(moved)

		expect(describeDragMove('Revenue', CELL, 24, 'shift', null)).toBe(moved)
	})
})

describe('describeDragEnd', () => {
	it('names the cell of a drop that moved the tile', () => {
		expect(describeDragEnd('Revenue', CELL, 24, true)).toBe(
			'Dropped Revenue at column 3 of 24, row 2, 8 columns wide.',
		)
	})

	it('says that a drop with no move left the board as it was', () => {
		expect(describeDragEnd('Revenue', CELL, 24, false)).toBe(
			'Dropped Revenue. The board did not change.',
		)
	})
})

describe('describeDragCancel', () => {
	it('names the cell that the tile returned to', () => {
		expect(describeDragCancel('Revenue', CELL, 24)).toBe(
			'Canceled. Revenue returned to column 3 of 24, row 2, 8 columns wide.',
		)
	})
})
