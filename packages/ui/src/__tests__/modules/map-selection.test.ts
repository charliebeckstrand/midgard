// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { MapOverlayEntry } from '../../modules/map/engine/map-overlay/entry'
import {
	ownStop,
	pickedStop,
	selectedMarkRow,
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

describe('pickedStop', () => {
	it('maps a reported index through the mark that counts in another space', () => {
		expect(pickedStop({ id: 'fleet', index: 1 }, 'fleet', FLEET.getStop)).toBe(0)

		expect(pickedStop({ id: 'fleet', index: 2 }, 'fleet', FLEET.getStop)).toBe(1)
	})

	it('reads an absent index as the first stop of the mark it names', () => {
		expect(pickedStop({ id: 'leg' }, 'leg', ROUTE.getStop)).toBe(0)
	})

	it('names nothing where the pick names another mark, or nothing at all', () => {
		expect(pickedStop({ id: 'fleet', index: 0 }, 'leg', ROUTE.getStop)).toBeNull()

		expect(pickedStop(null, 'leg', ROUTE.getStop)).toBeNull()
	})

	it('names nothing where the mark holds no stop for the index', () => {
		expect(pickedStop({ id: 'fleet', index: 9 }, 'fleet', FLEET.getStop)).toBeNull()

		// A mark that draws the stops it reports holds one, its own: the silence a
		// `selectedRegion` naming no region keeps, rather than a halo on that stop
		// whatever index was asked for.
		expect(pickedStop({ id: 'leg', index: 3 }, 'leg', ROUTE.getStop)).toBeNull()
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

describe('selectedMarkRow', () => {
	it('keys the row on the stop the mark draws, not the index reported', () => {
		expect(selectedMarkRow([ROUTE, FLEET], { id: 'fleet', index: 1 })).toBe('fleet:0')
	})

	it('marks no row where nothing is picked, or where the pick names no mark', () => {
		expect(selectedMarkRow([ROUTE, FLEET], null)).toBeNull()

		// A pick outliving the mark it was made against.
		expect(selectedMarkRow([ROUTE], { id: 'fleet' })).toBeNull()
	})
})
