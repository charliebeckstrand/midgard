import { describe, expect, it } from 'vitest'
import {
	formatTimestamp,
	resolveCurrentIndex,
	toColorMatch,
	toSegmentCollection,
} from '../../components/map/map-route-utilities'
import type { RouteData, RouteStop } from '../../components/map/types'

function stop(id: string, position: [number, number], status?: RouteStop['status']): RouteStop {
	return { id, name: id, position, status }
}

describe('toSegmentCollection', () => {
	it('returns no features when there are fewer than two stops', () => {
		const data: RouteData = { id: 'r', stops: [stop('a', [0, 0])] }

		const result = toSegmentCollection(data)

		expect(result.features).toHaveLength(0)
	})

	it('builds one segment between each consecutive pair of stops', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0]), stop('b', [1, 1]), stop('c', [2, 2])],
		}

		const result = toSegmentCollection(data)

		expect(result.features).toHaveLength(2)

		expect(result.features[0]?.geometry.coordinates).toEqual([
			[0, 0],
			[1, 1],
		])
	})

	it('uses the explicit path when provided', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0]), stop('b', [1, 1])],
			path: [
				[0, 0],
				[0.5, 0.5],
				[1, 1],
			],
		}

		const result = toSegmentCollection(data)

		expect(result.features).toHaveLength(2)
	})

	it('keeps a segment "done" when both endpoints are done', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0], 'done'), stop('b', [1, 1], 'done')],
		}

		const result = toSegmentCollection(data)

		expect(result.features[0]?.properties.status).toBe('done')
	})

	it('keeps the completed portion green up to the active stop', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0], 'done'), stop('b', [1, 1], 'active')],
		}

		const result = toSegmentCollection(data)

		expect(result.features[0]?.properties.status).toBe('done')
	})

	it('flags a segment "active" when only the destination is active', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0], 'pending'), stop('b', [1, 1], 'active')],
		}

		const result = toSegmentCollection(data)

		expect(result.features[0]?.properties.status).toBe('active')
	})

	it('flags a segment "active" when its origin is active regardless of the destination', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0], 'active'), stop('b', [1, 1], 'pending')],
		}

		const result = toSegmentCollection(data)

		expect(result.features[0]?.properties.status).toBe('active')
	})

	it('keeps a segment "done" when its origin is done but the destination is unvisited', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0], 'done'), stop('b', [1, 1], 'pending')],
		}

		const result = toSegmentCollection(data)

		expect(result.features[0]?.properties.status).toBe('done')
	})

	it('defaults to "pending" when neither endpoint has a status', () => {
		const data: RouteData = {
			id: 'r',
			stops: [stop('a', [0, 0]), stop('b', [1, 1])],
		}

		const result = toSegmentCollection(data)

		expect(result.features[0]?.properties.status).toBe('pending')
	})
})

describe('toColorMatch', () => {
	it('builds a MapLibre match expression with the configured colors', () => {
		const result = toColorMatch({ pending: '#aaa', active: '#0f0', done: '#00f' })

		expect(result).toEqual(['match', ['get', 'status'], 'done', '#00f', 'active', '#0f0', '#aaa'])
	})
})

describe('formatTimestamp', () => {
	it('returns null when no timestamp is provided', () => {
		expect(formatTimestamp(undefined)).toBeNull()
	})

	it('returns null for an invalid timestamp string', () => {
		expect(formatTimestamp('not-a-date')).toBeNull()
	})

	it('formats a Date instance', () => {
		const result = formatTimestamp(new Date('2024-01-15T13:45:00Z'))

		expect(result).toBeTypeOf('string')

		expect((result ?? '').length).toBeGreaterThan(0)
	})

	it('formats a date string', () => {
		const result = formatTimestamp('2024-01-15T13:45:00Z')

		expect(result).toBeTypeOf('string')
	})
})

describe('resolveCurrentIndex', () => {
	it('returns the index of the active stop when one exists', () => {
		const stops: RouteStop[] = [
			stop('a', [0, 0], 'done'),
			stop('b', [1, 1], 'active'),
			stop('c', [2, 2], 'pending'),
		]

		expect(resolveCurrentIndex(stops)).toBe(1)
	})

	it('falls back to the done count when there is no active stop', () => {
		const stops: RouteStop[] = [
			stop('a', [0, 0], 'done'),
			stop('b', [1, 1], 'done'),
			stop('c', [2, 2], 'pending'),
		]

		expect(resolveCurrentIndex(stops)).toBe(2)
	})

	it('clamps to the last index when every stop is done', () => {
		const stops: RouteStop[] = [stop('a', [0, 0], 'done'), stop('b', [1, 1], 'done')]

		expect(resolveCurrentIndex(stops)).toBe(1)
	})

	it('returns 0 for an empty stops array', () => {
		expect(resolveCurrentIndex([])).toBe(0)
	})
})
