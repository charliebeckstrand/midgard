import { describe, expect, it } from 'vitest'
import {
	describeDragCancel,
	describeDragEnd,
	describeDragMove,
	describeDragStart,
	describeResize,
} from '../../modules/dashboard/dashboard-announcements'
import type { LayoutCell } from '../../modules/dashboard/dashboard-layout'

const CELL: LayoutCell = { id: 'revenue', x: 2, y: 4, w: 12, h: 27, static: false }

describe('dashboard announcements', () => {
	it('speaks 1-based positions over the column span', () => {
		expect(describeDragStart('revenue', CELL, 24)).toBe(
			'Picked up tile revenue, column 3 of 24, row 5.',
		)

		expect(describeDragEnd('revenue', CELL, 24)).toBe(
			'Tile revenue dropped at column 3 of 24, row 5.',
		)

		expect(describeDragCancel('revenue', CELL, 24)).toBe(
			'Tile revenue returned to column 3 of 24, row 5.',
		)
	})

	it('names the reorder partner while one is on the table, else the landing spot', () => {
		expect(describeDragMove('revenue', CELL, 24)).toBe(
			'Tile revenue moved to column 3 of 24, row 5.',
		)

		expect(describeDragMove('revenue', CELL, 24, { id: 'orders', shift: true })).toBe(
			'Tile revenue over orders, drop to reorder.',
		)

		expect(describeDragMove('revenue', CELL, 24, { id: 'orders', shift: false })).toBe(
			'Tile revenue over orders, drop to swap.',
		)
	})

	it('pluralises the resize summary', () => {
		expect(describeResize('revenue', CELL)).toBe('Tile revenue resized to 12 columns by 27 rows.')

		expect(describeResize('spark', { ...CELL, w: 1, h: 1 })).toBe(
			'Tile spark resized to 1 column by 1 row.',
		)
	})
})
