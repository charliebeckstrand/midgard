import { describe, expect, it } from 'vitest'
import { ownStop, pickedStop, selectedMarkRow } from '../../modules/map/map-selection'
import type { MapOverlayEntry } from '../../modules/map/use-map-legend-registry'

/** A singular mark: one stop, its own. */
const ROUTE: MapOverlayEntry = {
	id: 'leg',
	label: 'Leg',
	kind: 'route',
	swatch: 'line',
	stopOf: ownStop,
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
	stopOf: (index) => [0, 0, 1][index] ?? null,
}

describe('pickedStop', () => {
	it('maps a reported index through the mark that counts in another space', () => {
		expect(pickedStop({ id: 'fleet', index: 1 }, 'fleet', FLEET.stopOf)).toBe(0)

		expect(pickedStop({ id: 'fleet', index: 2 }, 'fleet', FLEET.stopOf)).toBe(1)
	})

	it('reads an absent index as the first stop of the mark it names', () => {
		expect(pickedStop({ id: 'leg' }, 'leg', ROUTE.stopOf)).toBe(0)
	})

	it('names nothing where the pick names another mark, or nothing at all', () => {
		expect(pickedStop({ id: 'fleet', index: 0 }, 'leg', ROUTE.stopOf)).toBeNull()

		expect(pickedStop(null, 'leg', ROUTE.stopOf)).toBeNull()
	})

	it('names nothing where the mark holds no stop for the index', () => {
		expect(pickedStop({ id: 'fleet', index: 9 }, 'fleet', FLEET.stopOf)).toBeNull()

		// A mark that draws the stops it reports holds one, its own: the silence a
		// `selectedRegion` naming no region keeps, rather than a halo on that stop
		// whatever index was asked for.
		expect(pickedStop({ id: 'leg', index: 3 }, 'leg', ROUTE.stopOf)).toBeNull()
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
