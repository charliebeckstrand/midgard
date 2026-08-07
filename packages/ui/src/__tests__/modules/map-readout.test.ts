import { describe, expect, it } from 'vitest'
import { markReadout, markRows } from '../../modules/map/engine/map-overlay/readout'

/** A singular mark: one stop, no rows of its own. */
const ROUTE = { id: 'leg', label: 'Leg', detail: '312 mi', kind: 'route' }

/** A plural mark: a named dot with a count, a named dot without, and an unnamed one. */
const FLEET = {
	id: 'fleet',
	label: 'Stops',
	detail: '10 stops',
	kind: 'point',
	stopRows: [{ label: 'Depot', detail: '12 pallets' }, { label: 'Yard' }, {}],
}

describe('markReadout', () => {
	it('reads a singular mark by its own name and detail', () => {
		expect(markReadout(ROUTE, 0)).toEqual({ name: 'Leg', detail: '312 mi' })
	})

	it('reads a dot by its own name and detail', () => {
		expect(markReadout(FLEET, 0)).toEqual({ name: 'Depot', detail: '12 pallets' })
	})

	it("never lends the group's detail to a dot that carries none", () => {
		// The set's detail describes the set: a dot showing '10 stops' would
		// misreport itself as the whole round.
		expect(markReadout(FLEET, 1)).toEqual({ name: 'Yard', detail: undefined })
	})

	it('numbers an unnamed dot within its group', () => {
		// A reader has no position to tell two unnamed dots apart by.
		expect(markReadout(FLEET, 2)).toEqual({ name: 'Stops 3', detail: undefined })
	})

	it('reads a dot that carries a detail but no name', () => {
		const counted = {
			id: 'sites',
			label: 'Sites',
			kind: 'point',
			stopRows: [{ detail: '4 crews' }],
		}

		expect(markReadout(counted, 0)).toEqual({ name: 'Sites 1', detail: '4 crews' })
	})

	it('falls back to the mark past the end of its rows', () => {
		expect(markReadout(FLEET, 9)).toEqual({ name: 'Stops', detail: '10 stops' })
	})
})

describe('markRows', () => {
	it('gives a singular mark one row', () => {
		expect(markRows(ROUTE)).toEqual([{ key: 'leg:0', name: 'Leg', detail: '312 mi' }])
	})

	it('keys each row by the mark and the stop, so no caller keys by an index', () => {
		expect(markRows(FLEET).map((row) => row.key)).toEqual(['fleet:0', 'fleet:1', 'fleet:2'])
	})

	it('gives a plural mark a row per dot, agreeing with the tooltip', () => {
		const rows = markRows(FLEET)

		expect(rows).toHaveLength(3)

		// The table and the tooltip are two renderings of one readout, so the names
		// must match what markReadout gives the pointer for the same dot.
		for (const [stop, row] of rows.entries()) {
			expect(row.name).toBe(markReadout(FLEET, stop).name)
		}
	})

	it('falls back to the mark kind so the value column is never empty', () => {
		expect(markRows(FLEET)[1]?.detail).toBe('point')

		expect(markRows({ id: 'leg', label: 'Leg', kind: 'route' })).toEqual([
			{ key: 'leg:0', name: 'Leg', detail: 'route' },
		])
	})

	it('treats an empty set as the mark itself', () => {
		expect(markRows({ id: 'fleet', label: 'Stops', kind: 'point', stopRows: [] })).toEqual([
			{ key: 'fleet:0', name: 'Stops', detail: 'point' },
		])
	})
})
