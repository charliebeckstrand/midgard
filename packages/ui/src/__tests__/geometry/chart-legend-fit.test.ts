// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type LegendEntryRect,
	OVERFLOW_CHIP_RESERVE,
	visibleLegendCount,
} from '../../modules/chart/engine/chart-legend/fit'

/** Entries at ascending right edges on the given rows, in wrap order. */
function rects(...entries: [row: number, right: number][]): LegendEntryRect[] {
	return entries.map(([row, right]) => ({ row, right }))
}

const WIDTH = 400

describe('visibleLegendCount', () => {
	it.for<{ name: string; entries: LegendEntryRect[]; cap: number; count: number }>([
		{
			// Two rows of entries, cap of two: everything fits, so no chip and the full
			// count returns.
			name: 'shows every entry when none wrap past the cap',
			entries: rects([0, 120], [0, 250], [1, 130], [1, 260]),
			cap: 2,
			count: 4,
		},
		{
			// Five entries over three rows, cap two: the two on row 2 overflow. The last
			// visible sits on row 1 with room to spare, so the chip needs no trim.
			name: 'cuts at the cap when a later row overflows, chip room permitting',
			entries: rects([0, 120], [0, 250], [1, 130], [2, 120], [2, 250]),
			cap: 2,
			count: 3,
		},
		{
			// The last within-cap entry ends at 380 on the final capped row; the chip
			// needs 48 more, past the 400 edge, so it drops, and the chip takes its slot.
			name: 'trims the last visible entry when the chip would not fit beside it',
			entries: rects([0, 120], [1, 200], [1, 380], [2, 120]),
			cap: 2,
			count: 2,
		},
		{
			// Same shape, but the last entry ends at 300: the chip's 48 fits within 400,
			// so it stays.
			name: 'keeps the last visible entry when the chip fits beside it',
			entries: rects([0, 120], [1, 200], [1, 300], [2, 120]),
			cap: 2,
			count: 3,
		},
		{
			// Three entries pack the final row to its edge; the chip pushes the trim back
			// past all of them to the one that leaves room.
			// Rows: entry0 row0; entries 1-3 row1 (right 180/280/385); entry4 row2 spills.
			// The final row trims 385 (no room) and 280 (280+48=328 ≤ 400 → fits), so the
			// cut keeps entry0, entry1(180), entry2(280): three entries.
			name: 'cascades the trim across several tight entries on the final row',
			entries: rects([0, 300], [1, 180], [1, 280], [1, 385], [2, 120]),
			cap: 2,
			count: 3,
		},
		{
			name: 'shows nothing when the cap is zero',
			entries: rects([0, 120], [0, 250]),
			cap: 0,
			count: 0,
		},
	])('$name', ({ entries, cap, count }) => {
		expect(visibleLegendCount(entries, cap, WIDTH, OVERFLOW_CHIP_RESERVE)).toBe(count)
	})
})
