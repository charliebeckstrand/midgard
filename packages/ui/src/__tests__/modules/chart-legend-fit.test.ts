import { describe, expect, it } from 'vitest'
import {
	type LegendEntryRect,
	OVERFLOW_CHIP_RESERVE,
	visibleLegendCount,
} from '../../modules/chart/chart-legend-fit'

/** Entries at ascending right edges on the given rows, in wrap order. */
function rects(...entries: [row: number, right: number][]): LegendEntryRect[] {
	return entries.map(([row, right]) => ({ row, right }))
}

const WIDTH = 400

describe('visibleLegendCount', () => {
	it('shows every entry when none wrap past the cap', () => {
		// Two rows of entries, cap of two — everything fits, so no chip and the full
		// count returns.
		const count = visibleLegendCount(
			rects([0, 120], [0, 250], [1, 130], [1, 260]),
			2,
			WIDTH,
			OVERFLOW_CHIP_RESERVE,
		)

		expect(count).toBe(4)
	})

	it('cuts at the cap when a later row overflows, chip room permitting', () => {
		// Five entries over three rows, cap two: the two on row 2 overflow. The last
		// visible sits on row 1 with room to spare, so the chip needs no trim.
		const count = visibleLegendCount(
			rects([0, 120], [0, 250], [1, 130], [2, 120], [2, 250]),
			2,
			WIDTH,
			OVERFLOW_CHIP_RESERVE,
		)

		expect(count).toBe(3)
	})

	it('trims the last visible entry when the chip would not fit beside it', () => {
		// The last within-cap entry ends at 380 on the final capped row; the chip
		// needs 48 more, past the 400 edge — so it drops, and the chip takes its slot.
		const count = visibleLegendCount(
			rects([0, 120], [1, 200], [1, 380], [2, 120]),
			2,
			WIDTH,
			OVERFLOW_CHIP_RESERVE,
		)

		expect(count).toBe(2)
	})

	it('keeps the last visible entry when the chip fits beside it', () => {
		// Same shape, but the last entry ends at 300 — the chip's 48 fits within 400,
		// so it stays.
		const count = visibleLegendCount(
			rects([0, 120], [1, 200], [1, 300], [2, 120]),
			2,
			WIDTH,
			OVERFLOW_CHIP_RESERVE,
		)

		expect(count).toBe(3)
	})

	it('cascades the trim across several tight entries on the final row', () => {
		// Three entries pack the final row to its edge; the chip pushes the trim back
		// past all of them to the one that leaves room.
		const count = visibleLegendCount(
			rects([0, 300], [1, 180], [1, 280], [1, 385], [2, 120]),
			2,
			WIDTH,
			OVERFLOW_CHIP_RESERVE,
		)

		// Rows: entry0 row0; entries 1-3 row1 (right 180/280/385); entry4 row2 spills.
		// The final row trims 385 (no room) and 280 (280+48=328 ≤ 400 → fits), so the
		// cut keeps entry0, entry1(180), entry2(280) — three entries.
		expect(count).toBe(3)
	})

	it('shows nothing when the cap is zero', () => {
		expect(visibleLegendCount(rects([0, 120], [0, 250]), 0, WIDTH, OVERFLOW_CHIP_RESERVE)).toBe(0)
	})
})
