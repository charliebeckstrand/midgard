// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createDotPool } from '../../modules/map/engine/map-cluster/pool'
import type { MapOverlayEntry } from '../../modules/map/engine/map-overlay/entry'
import type { LngLat, MapPoint2D } from '../../modules/map/engine/types'

/**
 * The pool a dot divides its ground against. A mark that moves changes no entry of the ledger, so
 * the plat keeps the same pool, and the mark restakes its own dots in it. These pin when a restake
 * reaches the readers: only after a read, and only when a dot moved.
 */

/** A plain projection: lon to x, lat to y. */
function project([lng, lat]: LngLat): MapPoint2D {
	return { x: lng, y: lat }
}

/** A ledger entry whose stops read the live value in `stops`. */
function entry(id: string, stops: { current: LngLat[] }, kind: MapOverlayEntry['kind'] = 'point') {
	return {
		id,
		label: id,
		kind,
		swatch: 'dot',
		stopsAt: () => stops.current,
		stopOf: () => 0,
	} satisfies MapOverlayEntry
}

describe('createDotPool', () => {
	it('gathers nothing until a reader asks', () => {
		const stopsAt = vi.fn((): LngLat[] => [[1, 1]])

		const pool = createDotPool([{ ...entry('a', { current: [] }), stopsAt }], new Set(), project)

		pool.restake('a')

		expect(stopsAt).not.toHaveBeenCalled()

		expect(pool.neighbors()('b')).toEqual([{ x: 1, y: 1 }])

		expect(stopsAt).toHaveBeenCalledTimes(1)
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

		expect(pool.neighbors()('a')).toEqual([{ x: 2, y: 2 }])
	})

	it('tells its readers when a restaked mark moved, and gives a new snapshot', () => {
		const a = { current: [[1, 1]] as LngLat[] }

		const pool = createDotPool(
			[entry('a', a), entry('b', { current: [[2, 2]] })],
			new Set(),
			project,
		)

		const listener = vi.fn()

		pool.subscribe(listener)

		const before = pool.neighbors()

		expect(before('b')).toEqual([{ x: 1, y: 1 }])

		a.current = [[5, 5]]

		pool.restake('a')

		expect(listener).toHaveBeenCalledTimes(1)

		expect(pool.neighbors()).not.toBe(before)

		expect(pool.neighbors()('b')).toEqual([{ x: 5, y: 5 }])
	})

	it('holds the snapshot when a restaked mark stands where it stood', () => {
		const pool = createDotPool([entry('a', { current: [[1, 1]] })], new Set(), project)

		const listener = vi.fn()

		pool.subscribe(listener)

		const before = pool.neighbors()

		before('b')

		pool.restake('a')

		expect(listener).not.toHaveBeenCalled()

		expect(pool.neighbors()).toBe(before)
	})
})
