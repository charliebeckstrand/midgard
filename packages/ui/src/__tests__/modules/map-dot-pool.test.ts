// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createDotPool } from '../../modules/map/engine/map-cluster/pool'
import type { MapEntryDot, MapOverlayEntry } from '../../modules/map/engine/map-overlay/entry'
import type { LngLat, MapPoint2D } from '../../modules/map/engine/types'

/**
 * The pool a dot divides its ground against. A mark that moves changes no entry of the ledger, so
 * the plat keeps the same pool, and the mark restakes its own dots in it. These pin when a restake
 * reaches the readers: only after a read, and only when a dot moved. They also pin which readers it
 * reaches: each other mark, and not the mark that moved.
 */

/** A plain projection: lon to x, lat to y. */
function project([lng, lat]: LngLat): MapPoint2D {
	return { x: lng, y: lat }
}

/** The radius each dot of {@link entry} paints at, in device pixels. */
const RADIUS = 5.5

/** A dot of {@link RADIUS} at a frame position, as the pool holds it under {@link project}. */
function dot(x: number, y: number, radius = RADIUS) {
	return { at: { x, y }, radius }
}

/**
 * A ledger entry whose stops read the live value in `stops`. A dot-drawing kind draws its stops as
 * its dots, at the live radius in `radius`, and a line or area kind draws none, as the marks
 * register them.
 */
function entry(
	id: string,
	stops: { current: LngLat[] },
	kind: MapOverlayEntry['kind'] = 'point',
	radius = { current: RADIUS },
) {
	const stopsAt = () => stops.current

	const drawn = (): MapEntryDot[] => stops.current.map((at) => ({ at, radius: radius.current }))

	return {
		id,
		label: id,
		kind,
		swatch: 'dot',
		stopsAt,
		dotsAt: kind === 'route' || kind === 'geofence' ? undefined : drawn,
		getStop: () => 0,
	} satisfies MapOverlayEntry
}

describe('createDotPool', () => {
	it('gathers nothing until a reader asks', () => {
		const dotsAt = vi.fn((): MapEntryDot[] => [{ at: [1, 1], radius: RADIUS }])

		const pool = createDotPool([{ ...entry('a', { current: [] }), dotsAt }], new Set(), project)

		pool.restake('a')

		expect(dotsAt).not.toHaveBeenCalled()

		const view = pool.neighbors('b')

		expect(dotsAt).not.toHaveBeenCalled()

		expect(view()).toEqual([dot(1, 1)])

		expect(dotsAt).toHaveBeenCalledTimes(1)
	})

	it('leaves out the asking mark, hidden marks, and marks that draw no dot', () => {
		const pool = createDotPool(
			[
				entry('a', { current: [[1, 1]] }),
				entry('b', { current: [[2, 2]] }),
				entry('c', { current: [[3, 3]] }),
				entry('d', { current: [[4, 4]] }, 'route'),
			],
			new Set(['c']),
			project,
		)

		expect(pool.neighbors('a')()).toEqual([dot(2, 2)])
	})

	it('holds the drawn dots of a mark that names them apart from its stops', () => {
		// A marker: its keyboard stop is the middle of its leg, and it draws a pin at each end.
		const marker = {
			...entry('m', { current: [[5, 0]] }, 'marker'),
			dotsAt: (): MapEntryDot[] => [
				{ at: [0, 0], radius: 4 },
				{ at: [10, 0], radius: 4 },
			],
		}

		const pool = createDotPool([marker], new Set(), project)

		expect(pool.neighbors('p')()).toEqual([dot(0, 0, 4), dot(10, 0, 4)])
	})

	it('tells its readers when a restaked mark moved, and gives each other mark a new snapshot', () => {
		const a = { current: [[1, 1]] as LngLat[] }

		const pool = createDotPool(
			[entry('a', a), entry('b', { current: [[2, 2]] })],
			new Set(),
			project,
		)

		const listener = vi.fn()

		pool.subscribe(listener)

		const before = pool.neighbors('b')

		expect(before()).toEqual([dot(1, 1)])

		a.current = [[5, 5]]

		pool.restake('a')

		expect(listener).toHaveBeenCalledTimes(1)

		expect(pool.neighbors('b')).not.toBe(before)

		expect(pool.neighbors('b')()).toEqual([dot(5, 5)])
	})

	it('holds the snapshot of the mark that moved, which holds none of its dots', () => {
		const a = { current: [[1, 1]] as LngLat[] }

		const b = { current: [[2, 2]] as LngLat[] }

		const pool = createDotPool([entry('a', a), entry('b', b)], new Set(), project)

		const own = pool.neighbors('a')

		expect(own()).toEqual([dot(2, 2)])

		a.current = [[5, 5]]

		pool.restake('a')

		expect(pool.neighbors('a')).toBe(own)

		// The held snapshot reads the live pool, so a later move of the other mark reaches it.
		b.current = [[7, 7]]

		pool.restake('b')

		expect(pool.neighbors('a')).not.toBe(own)

		expect(own()).toEqual([dot(7, 7)])
	})

	it('tells its readers when a restaked mark resized in place', () => {
		// A summary that takes in one more stop grows a grade without moving, and the dots beside it
		// divide their ground against the new face.
		const radius = { current: RADIUS }

		const pool = createDotPool(
			[entry('a', { current: [[1, 1]] }, 'point', radius), entry('b', { current: [[2, 2]] })],
			new Set(),
			project,
		)

		const listener = vi.fn()

		pool.subscribe(listener)

		pool.neighbors('b')()

		radius.current = 9

		pool.restake('a')

		expect(listener).toHaveBeenCalledTimes(1)

		expect(pool.neighbors('b')()).toEqual([dot(1, 1, 9)])
	})

	it('holds the snapshot when a restaked mark stands where it stood', () => {
		const pool = createDotPool([entry('a', { current: [[1, 1]] })], new Set(), project)

		const listener = vi.fn()

		pool.subscribe(listener)

		const before = pool.neighbors('b')

		before()

		pool.restake('a')

		expect(listener).not.toHaveBeenCalled()

		expect(pool.neighbors('b')).toBe(before)
	})
})
