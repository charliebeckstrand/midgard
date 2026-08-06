import { describe, expect, it } from 'vitest'
import { markStop, selectedMarkRow } from '../../modules/map/map-selection'
import type { MapOverlayEntry } from '../../modules/map/use-map-legend-registry'

/** A singular mark: one stop, its own, and no mapper. */
const ROUTE: MapOverlayEntry = { id: 'leg', label: 'Leg', kind: 'route', swatch: 'line' }

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

describe('markStop', () => {
	it('maps a reported index through the mark that counts in another space', () => {
		expect(markStop(FLEET.stopOf, 1)).toBe(0)

		expect(markStop(FLEET.stopOf, 2)).toBe(1)
	})

	it('names nothing where the mapper holds no stop for the index', () => {
		expect(markStop(FLEET.stopOf, 9)).toBeNull()
	})

	it('names the one stop a mark without a mapper draws', () => {
		expect(markStop(undefined, 0)).toBe(0)
	})

	it('names nothing past that one stop', () => {
		// The silence a `selectedRegion` naming no region keeps, rather than a halo
		// on the mark's own stop whatever index was asked for.
		expect(markStop(undefined, 3)).toBeNull()
	})
})

describe('selectedMarkRow', () => {
	it('keys the row on the stop the mark draws, not the index reported', () => {
		expect(selectedMarkRow([ROUTE, FLEET], { id: 'fleet', stop: 1 })).toBe('fleet:0')
	})

	it('keys a singular mark on its own stop', () => {
		expect(selectedMarkRow([ROUTE, FLEET], { id: 'leg', stop: 0 })).toBe('leg:0')
	})

	it('marks no row where nothing is picked, or where the pick names no mark', () => {
		expect(selectedMarkRow([ROUTE, FLEET], null)).toBeNull()

		// A pick outliving the mark it was made against.
		expect(selectedMarkRow([ROUTE], { id: 'fleet', stop: 0 })).toBeNull()
	})

	it('marks no row for a stop the named mark does not draw', () => {
		expect(selectedMarkRow([ROUTE, FLEET], { id: 'fleet', stop: 9 })).toBeNull()

		expect(selectedMarkRow([ROUTE, FLEET], { id: 'leg', stop: 1 })).toBeNull()
	})
})
