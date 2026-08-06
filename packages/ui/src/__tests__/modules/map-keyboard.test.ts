import { describe, expect, it, vi } from 'vitest'
import {
	isMapActivateKey,
	type MapStop,
	mapStops,
	moveMapCursor,
	stepNearest,
} from '../../modules/map/map-keyboard'
import type { LngLat } from '../../modules/map/types'

/** A region stop at a frame position, the shape the plat assembles. */
function region(index: number, x: number, y: number): MapStop {
	return { target: { kind: 'region', index }, at: { x, y } }
}

/** An overlay stop at a frame position. */
function entry(id: string, x: number, y: number): MapStop {
	return { target: { kind: 'entry', id }, at: { x, y } }
}

/** Three stops in a west-to-east row, the shape the module's own fixture projects to. */
const ROW = [region(0, 0, 0), region(1, 10, 0), region(2, 20, 0)]

/** Two stops stacked north to south; frame y grows downward, so index 1 is south. */
const COLUMN = [region(0, 0, 0), region(1, 0, 10)]

describe('isMapActivateKey', () => {
	it('takes Enter and Space, and nothing else', () => {
		expect(isMapActivateKey('Enter')).toBe(true)

		expect(isMapActivateKey(' ')).toBe(true)

		expect(isMapActivateKey('Spacebar')).toBe(false)

		expect(isMapActivateKey('ArrowUp')).toBe(false)
	})
})

describe('mapStops', () => {
	const project = (at: LngLat) => ({ x: at[0], y: at[1] })

	const NONE: ReadonlySet<string> = new Set()

	it('lists the regions first, then the overlays', () => {
		// Regions lead so Home and End read as the geography's own ends, and the
		// marks drawn over it follow.
		const stops = mapStops(
			[
				[0, 0],
				[10, 0],
			],
			[{ id: 'depot', anchorAt: () => [5, 5] }],
			NONE,
			project,
		)

		expect(stops.map((stop) => stop.target)).toEqual([
			{ kind: 'region', index: 0 },
			{ kind: 'region', index: 1 },
			{ kind: 'entry', id: 'depot' },
		])

		expect(stops[2]?.at).toEqual({ x: 5, y: 5 })
	})

	it('keeps a region index aligned with the features when an earlier one drops', () => {
		// The first region has no centroid, so it is not a stop — but the second
		// must still report index 1, the index the layers draw it at.
		const stops = mapStops([null, [10, 0]], [], NONE, project)

		expect(stops).toHaveLength(1)

		expect(stops[0]?.target).toEqual({ kind: 'region', index: 1 })
	})

	it('leaves out a stop the projection has no image for', () => {
		// The US composite drops points outside its insets; the cursor must never
		// land where the map draws nothing.
		const dropped = mapStops(
			[[0, 0]],
			[{ id: 'far', anchorAt: () => [99, 99] }],
			NONE,
			(at: LngLat) => (at[0] > 50 ? null : { x: at[0], y: at[1] }),
		)

		expect(dropped).toHaveLength(1)

		expect(dropped[0]?.target).toEqual({ kind: 'region', index: 0 })
	})

	it('leaves out an overlay that has registered no anchor yet', () => {
		expect(
			mapStops([], [{ id: 'pending' }, { id: 'empty', anchorAt: () => null }], NONE, project),
		).toEqual([])
	})

	it('leaves out a mark the legend has toggled off', () => {
		// A hidden overlay unmounts its shapes but keeps its registration, so
		// without this the cursor would stand on a mark that draws nothing, read it
		// out, and pick it. A toggled-off region is different — it still paints, in
		// the neutral fill — so the geography stays whole.
		const stops = mapStops(
			[[0, 0]],
			[
				{ id: 'shown', anchorAt: () => [5, 5] },
				{ id: 'off', anchorAt: () => [8, 8] },
			],
			new Set(['off']),
			project,
		)

		expect(stops.map((stop) => stop.target)).toEqual([
			{ kind: 'region', index: 0 },
			{ kind: 'entry', id: 'shown' },
		])
	})

	it('reads each anchor fresh, so a mark that moves needs no re-registration', () => {
		const anchorAt = vi.fn<() => LngLat | null>(() => [1, 1])

		mapStops([], [{ id: 'route', anchorAt }], NONE, project)

		anchorAt.mockReturnValue([2, 2])

		expect(mapStops([], [{ id: 'route', anchorAt }], NONE, project)[0]?.at).toEqual({ x: 2, y: 2 })
	})
})

describe('stepNearest', () => {
	it('steps to the nearest stop bearing the arrow, not the next by index', () => {
		expect(stepNearest(ROW, 0, 'east')).toBe(1)

		expect(stepNearest(ROW, 1, 'east')).toBe(2)

		expect(stepNearest(ROW, 2, 'west')).toBe(1)
	})

	it('reads north and south against frame coordinates, where y grows downward', () => {
		expect(stepNearest(COLUMN, 0, 'south')).toBe(1)

		expect(stepNearest(COLUMN, 1, 'north')).toBe(0)

		expect(stepNearest(COLUMN, 0, 'north')).toBeNull()
	})

	it('reports nothing at the edge, so the caller holds the cursor rather than wraps', () => {
		expect(stepNearest(ROW, 2, 'east')).toBeNull()

		expect(stepNearest(ROW, 0, 'west')).toBeNull()

		// A row has no vertical neighbour in either direction.
		expect(stepNearest(ROW, 1, 'north')).toBeNull()
	})

	it('reaches a stop on the diagonal from either of its two wedges', () => {
		// The four wedges tile the plane, so a stop at 45° lies in two of them and
		// both readings are true — which is why no step needs a fallback.
		const diagonal = [region(0, 0, 0), region(1, 10, 10)]

		expect(stepNearest(diagonal, 0, 'east')).toBe(1)

		expect(stepNearest(diagonal, 0, 'south')).toBe(1)

		expect(stepNearest(diagonal, 0, 'west')).toBeNull()
	})

	it('crosses between a region and an overlay, which share one field', () => {
		const mixed = [region(0, 0, 0), entry('depot', 10, 0)]

		expect(stepNearest(mixed, 0, 'east')).toBe(1)

		expect(stepNearest(mixed, 1, 'west')).toBe(0)
	})
})

describe('moveMapCursor', () => {
	it('enters at the first stop on the first arrow rather than stepping past it', () => {
		expect(moveMapCursor(null, 'ArrowRight', ROW).stop).toBe(ROW[0])

		expect(moveMapCursor(null, 'ArrowUp', ROW).stop).toBe(ROW[0])
	})

	it('steps by compass direction once the cursor is on the map', () => {
		expect(moveMapCursor(0, 'ArrowRight', ROW).stop).toBe(ROW[1])

		expect(moveMapCursor(1, 'ArrowLeft', ROW).stop).toBe(ROW[0])
	})

	it('holds the cursor at the edge instead of wrapping to the far side', () => {
		expect(moveMapCursor(2, 'ArrowRight', ROW).stop).toBe(ROW[2])

		expect(moveMapCursor(0, 'ArrowLeft', ROW).stop).toBe(ROW[0])
	})

	it('jumps to the ends of the list with Home and End', () => {
		expect(moveMapCursor(1, 'Home', ROW).stop).toBe(ROW[0])

		expect(moveMapCursor(1, 'End', ROW).stop).toBe(ROW[2])
	})

	it('clears on Escape', () => {
		expect(moveMapCursor(1, 'Escape', ROW)).toEqual({ handled: true, stop: null })
	})

	it('leaves an unhandled key alone', () => {
		expect(moveMapCursor(1, 'a', ROW).handled).toBe(false)
	})

	it('reports nothing to navigate when the map has no stop', () => {
		expect(moveMapCursor(null, 'ArrowRight', [])).toEqual({ handled: true, stop: null })

		expect(moveMapCursor(null, 'Home', [])).toEqual({ handled: true, stop: null })
	})

	it('re-enters at the first stop when the cursor names one the list has lost', () => {
		// An overlay that unmounts, or a geography swap, shortens the list under a
		// parked cursor.
		expect(moveMapCursor(9, 'ArrowRight', ROW).stop).toBe(ROW[0])
	})
})
