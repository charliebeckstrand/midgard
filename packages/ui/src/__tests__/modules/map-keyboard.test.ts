import { describe, expect, it } from 'vitest'
import type { MapPoint2D } from '../../modules/map/map-geometry'
import { isMapActivateKey, moveMapCursor, stepRegion } from '../../modules/map/map-keyboard'

/** Three centroids in a west-to-east row, the shape the module's own fixture projects to. */
const ROW: (MapPoint2D | null)[] = [
	{ x: 0, y: 0 },
	{ x: 10, y: 0 },
	{ x: 20, y: 0 },
]

/** Two centroids stacked north to south; frame y grows downward, so index 1 is south. */
const COLUMN: (MapPoint2D | null)[] = [
	{ x: 0, y: 0 },
	{ x: 0, y: 10 },
]

describe('isMapActivateKey', () => {
	it('takes Enter and Space, and nothing else', () => {
		expect(isMapActivateKey('Enter')).toBe(true)

		expect(isMapActivateKey(' ')).toBe(true)

		expect(isMapActivateKey('Spacebar')).toBe(false)

		expect(isMapActivateKey('ArrowUp')).toBe(false)
	})
})

describe('stepRegion', () => {
	it('steps to the nearest region bearing the arrow, not the next by index', () => {
		// From the west end, east reaches its neighbour rather than the far region.
		expect(stepRegion(ROW, 0, 'east')).toBe(1)

		expect(stepRegion(ROW, 1, 'east')).toBe(2)

		expect(stepRegion(ROW, 2, 'west')).toBe(1)
	})

	it('reads north and south against frame coordinates, where y grows downward', () => {
		expect(stepRegion(COLUMN, 0, 'south')).toBe(1)

		expect(stepRegion(COLUMN, 1, 'north')).toBe(0)

		expect(stepRegion(COLUMN, 0, 'north')).toBeNull()
	})

	it('reports nothing at the edge, so the caller holds the cursor rather than wraps', () => {
		expect(stepRegion(ROW, 2, 'east')).toBeNull()

		expect(stepRegion(ROW, 0, 'west')).toBeNull()

		// A row has no vertical neighbour in either direction.
		expect(stepRegion(ROW, 1, 'north')).toBeNull()
	})

	it('skips a region the geometry dropped', () => {
		const gapped: (MapPoint2D | null)[] = [{ x: 0, y: 0 }, null, { x: 10, y: 0 }]

		expect(stepRegion(gapped, 0, 'east')).toBe(2)
	})

	it('reaches a region on the diagonal from either of its two wedges', () => {
		// The four wedges tile the plane, so a region at 45° lies in two of them
		// and both readings are true — which is why no step needs a fallback.
		const diagonal: (MapPoint2D | null)[] = [
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		]

		expect(stepRegion(diagonal, 0, 'east')).toBe(1)

		expect(stepRegion(diagonal, 0, 'south')).toBe(1)

		expect(stepRegion(diagonal, 0, 'west')).toBeNull()
	})

	it('reports nothing from a region that carries no centroid', () => {
		expect(stepRegion([null, { x: 10, y: 0 }], 0, 'east')).toBeNull()
	})
})

describe('moveMapCursor', () => {
	it('enters at the first drawn region on the first arrow rather than stepping past it', () => {
		expect(moveMapCursor(null, 'ArrowRight', ROW)).toEqual({ handled: true, cursor: 0 })

		expect(moveMapCursor(null, 'ArrowUp', ROW)).toEqual({ handled: true, cursor: 0 })
	})

	it('steps by compass direction once the cursor is on the map', () => {
		expect(moveMapCursor(0, 'ArrowRight', ROW)).toEqual({ handled: true, cursor: 1 })

		expect(moveMapCursor(1, 'ArrowLeft', ROW)).toEqual({ handled: true, cursor: 0 })
	})

	it('holds the cursor at the edge instead of wrapping to the far side', () => {
		expect(moveMapCursor(2, 'ArrowRight', ROW)).toEqual({ handled: true, cursor: 2 })

		expect(moveMapCursor(0, 'ArrowLeft', ROW)).toEqual({ handled: true, cursor: 0 })
	})

	it('jumps to the ends of the atlas order, skipping regions with no centroid', () => {
		expect(moveMapCursor(1, 'Home', ROW)).toEqual({ handled: true, cursor: 0 })

		expect(moveMapCursor(1, 'End', ROW)).toEqual({ handled: true, cursor: 2 })

		const gapped: (MapPoint2D | null)[] = [null, { x: 10, y: 0 }, null]

		expect(moveMapCursor(null, 'Home', gapped)).toEqual({ handled: true, cursor: 1 })

		expect(moveMapCursor(null, 'End', gapped)).toEqual({ handled: true, cursor: 1 })
	})

	it('clears on Escape', () => {
		expect(moveMapCursor(1, 'Escape', ROW)).toEqual({ handled: true, cursor: null })
	})

	it('leaves an unhandled key alone, cursor untouched', () => {
		expect(moveMapCursor(1, 'a', ROW)).toEqual({ handled: false, cursor: 1 })
	})

	it('reports nothing to navigate when no region carries a centroid', () => {
		expect(moveMapCursor(null, 'ArrowRight', [null, null])).toEqual({ handled: true, cursor: null })
	})

	it('re-enters at the first region when the cursor names one the geometry dropped', () => {
		// A geography swap can shorten the list, or drop a region's centroid, under
		// a parked cursor.
		expect(moveMapCursor(9, 'ArrowRight', ROW)).toEqual({ handled: true, cursor: 0 })

		expect(moveMapCursor(0, 'ArrowRight', [null, { x: 10, y: 0 }])).toEqual({
			handled: true,
			cursor: 1,
		})
	})
})
