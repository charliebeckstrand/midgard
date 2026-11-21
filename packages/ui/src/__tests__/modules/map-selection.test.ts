// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { MapOverlayEntry } from '../../modules/map/engine/map-overlay/entry'
import {
	ownStop,
	pickedStops,
	samePicks,
	selectedMarkRows,
	targetParts,
	targetStop,
} from '../../modules/map/engine/map-overlay/selection'

/** A singular mark: one stop, its own. */
const ROUTE: MapOverlayEntry = {
	id: 'leg',
	label: 'Leg',
	kind: 'route',
	swatch: 'line',
	stopsAt: () => [],
	getStop: ownStop,
}

/**
 * A plural mark whose first two points draw as one summary: point 0 and point 1
 * both land on stop 0, point 2 on stop 1, and nothing else lands at all.
 */
const FLEET: MapOverlayEntry = {
	id: 'fleet',
	label: 'Stops',
	kind: 'point',
	swatch: 'dot',
	stopRows: [{ label: 'Stops' }, { label: 'Yard' }],
	stopsAt: () => [],
	getStop: (index) => [0, 0, 1][index] ?? null,
}

describe('pickedStops', () => {
	it('maps a reported index through the mark that counts in another space', () => {
		expect(pickedStops([{ id: 'fleet', index: 1 }], 'fleet', FLEET.getStop)).toEqual([0])

		expect(pickedStops([{ id: 'fleet', index: 2 }], 'fleet', FLEET.getStop)).toEqual([1])
	})

	it('reads an absent index as the first stop of the mark it names', () => {
		expect(pickedStops([{ id: 'leg' }], 'leg', ROUTE.getStop)).toEqual([0])
	})

	it('names nothing where the picks name another mark, or nothing at all', () => {
		expect(pickedStops([{ id: 'fleet', index: 0 }], 'leg', ROUTE.getStop)).toEqual([])

		expect(pickedStops([], 'leg', ROUTE.getStop)).toEqual([])
	})

	it('names nothing where the mark holds no stop for the index', () => {
		expect(pickedStops([{ id: 'fleet', index: 9 }], 'fleet', FLEET.getStop)).toEqual([])

		// A mark that draws the stops it reports holds one, its own: the silence a
		// `selectedRegions` entry naming no region keeps, rather than a halo on that
		// stop whatever index was asked for.
		expect(pickedStops([{ id: 'leg', index: 3 }], 'leg', ROUTE.getStop)).toEqual([])
	})

	it('names each stop of a set one time, in ascending order', () => {
		// Points 0 and 1 land in one summary, so two picks name it one time.
		const picks = [
			{ id: 'fleet', index: 2 },
			{ id: 'fleet', index: 1 },
			{ id: 'leg' },
			{ id: 'fleet', index: 0 },
		]

		expect(pickedStops(picks, 'fleet', FLEET.getStop)).toEqual([0, 1])
	})
})

describe('targetStop', () => {
	it('names the stop that holds the reported index, not the stop the target held', () => {
		// The target held stop 1 for point 1, and a regroup merged point 1 into stop 0.
		expect(targetStop({ kind: 'entry', id: 'fleet', stop: 1, reported: 1 }, FLEET.getStop)).toBe(0)
	})

	it('names its own stop with no reported index, or one the mark no longer draws', () => {
		expect(targetStop({ kind: 'entry', id: 'fleet', stop: 1 }, FLEET.getStop)).toBe(1)

		expect(targetStop({ kind: 'entry', id: 'fleet', stop: 1, reported: 9 }, FLEET.getStop)).toBe(1)
	})
})

describe('selectedMarkRows', () => {
	it('keys each row on the stop the mark draws, not the index reported', () => {
		expect(selectedMarkRows([ROUTE, FLEET], [{ id: 'fleet', index: 1 }])).toEqual(
			new Set(['fleet:0']),
		)
	})

	it('marks the rows of every mark that the picks name', () => {
		const rows = selectedMarkRows(
			[ROUTE, FLEET],
			[{ id: 'fleet', index: 2 }, { id: 'leg' }, { id: 'fleet', index: 0 }],
		)

		expect(rows).toEqual(new Set(['leg:0', 'fleet:0', 'fleet:1']))
	})

	it('marks no row where nothing is picked, or where the picks name no mark', () => {
		expect(selectedMarkRows([ROUTE, FLEET], []).size).toBe(0)

		// A pick outliving the mark it was made against.
		expect(selectedMarkRows([ROUTE], [{ id: 'fleet' }]).size).toBe(0)
	})
})

describe('samePicks', () => {
	it('matches a list to itself', () => {
		const picks = [{ id: 'leg' }]

		expect(samePicks(picks, picks)).toBe(true)
	})

	it('matches two lists of the same pairs in the same order', () => {
		expect(
			samePicks(
				[{ id: 'leg' }, { id: 'fleet', index: 1 }],
				[{ id: 'leg' }, { id: 'fleet', index: 1 }],
			),
		).toBe(true)
	})

	it('tells apart a different pair, a different order, and a different length', () => {
		expect(samePicks([{ id: 'fleet', index: 1 }], [{ id: 'fleet', index: 2 }])).toBe(false)

		expect(samePicks([{ id: 'fleet', index: 1 }], [{ id: 'fleet' }])).toBe(false)

		expect(samePicks([{ id: 'leg' }, { id: 'fleet' }], [{ id: 'fleet' }, { id: 'leg' }])).toBe(
			false,
		)

		expect(samePicks([{ id: 'leg' }], [])).toBe(false)
	})
})

describe('targetParts', () => {
	it('names the stop of the target alone where the stop shares no summary', () => {
		expect(targetParts({ kind: 'entry', id: 'fleet', stop: 0, reported: 2 }, FLEET)).toEqual([
			{ id: 'fleet', stop: 1 },
		])
	})

	it('names every part of the shared summary that holds the stop', () => {
		const parts = [
			{ id: 'fleet', stop: 1 },
			{ id: 'depots', stop: 0 },
		]

		const shared = { ...FLEET, stopRows: [{ label: 'Stops' }, { label: 'Yard', parts }] }

		expect(targetParts({ kind: 'entry', id: 'fleet', stop: 1 }, shared)).toBe(parts)
	})
})
