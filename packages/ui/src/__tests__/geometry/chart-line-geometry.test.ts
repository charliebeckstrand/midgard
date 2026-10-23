// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hasIsolatedPoint, lineGeometry } from '../../modules/chart/engine/chart-geometry/line'

describe('lineGeometry', () => {
	const identity = (value: number) => value

	it('breaks the path at gaps and keeps isolated points visible', () => {
		const geometry = lineGeometry([1, 2, null, 4, null], [0, 10, 20, 30, 40], identity, 100)

		expect(geometry.segments).toHaveLength(1)

		expect(geometry.segments[0]).toBe('M 0 1 L 10 2')

		// The run of one at x=30 has no segment; it must surface as a marker.
		expect(geometry.isolated).toEqual([{ x: 30, y: 4 }])

		expect(geometry.points).toHaveLength(3)
	})

	it('closes each area run down to the baseline', () => {
		const geometry = lineGeometry([1, 2], [0, 10], identity, 100)

		expect(geometry.areas[0]).toBe('M 0 1 L 10 2 L 10 100 L 0 100 Z')
	})

	it('yields nothing for an all-null series', () => {
		const geometry = lineGeometry([null, null], [0, 10], identity, 100)

		expect(geometry.segments).toHaveLength(0)

		expect(geometry.points).toHaveLength(0)
	})

	it('draws a monotone cubic under smooth interpolation without overshooting', () => {
		const linear = lineGeometry([10, 30, 20], [0, 10, 20], identity, 100, 'linear')

		expect(linear.segments[0]).not.toContain('C')

		const smooth = lineGeometry([10, 30, 20], [0, 10, 20], identity, 100, 'smooth')

		// Cubic segments, and the peak's tangent flattens so the curve can't
		// rise past y=30 (in this identity map, past the data max).
		expect(smooth.segments[0]).toContain('C')

		const ys = [...(smooth.segments[0] as string).matchAll(/[\d.]+ ([\d.]+)/g)].map((match) =>
			Number(match[1]),
		)

		expect(Math.max(...ys)).toBeLessThanOrEqual(30)
	})

	it('stays a straight segment when a run is too short to curve', () => {
		const smooth = lineGeometry([10, 30], [0, 10], identity, 100, 'smooth')

		expect(smooth.segments[0]).toBe('M 0 10 L 10 30')
	})

	it('leaves a run at drawing resolution byte-for-byte unchanged', () => {
		// Three points across 800px — far below the two-per-pixel threshold, so
		// decimation is a no-op and the path is exactly the undecimated one.
		const geometry = lineGeometry([1, 2, 3], [0, 400, 800], identity, 100)

		expect(geometry.segments[0]).toBe('M 0 1 L 400 2 L 800 3')
	})

	it('decimates a dense run for drawing while keeping data full-resolution', () => {
		// 8,000 points across an 800px span is ten per pixel — far denser than the
		// plot can show, so the drawn path collapses to the per-column envelope.
		const count = 8_000

		const xs = Array.from({ length: count }, (_, index) => (index / (count - 1)) * 800)

		const values = Array.from({ length: count }, (_, index) => Math.sin(index / 20) * 40 + 50)

		// An unmistakable single-column spike that decimation must keep.
		values[1234] = 9999

		const geometry = lineGeometry(values, xs, identity, 100)

		const drawn = (geometry.segments[0]?.match(/L /g)?.length ?? 0) + 1

		// The drawn path is a fraction of the data…
		expect(drawn).toBeLessThan(count / 2)

		// …the spike survives it…
		expect(geometry.segments[0]).toContain('9999')

		// …the endpoints are exact…
		expect(geometry.segments[0]?.startsWith('M 0 ')).toBe(true)

		// …and the hit-test / marker / table run keeps every point.
		expect(geometry.runs[0]).toHaveLength(count)

		expect(geometry.points).toHaveLength(count)
	})

	it('decimates each dense run that a gap splits off', () => {
		// A null in every thousand points splits the line into runs, each still ten
		// points to a pixel. Each run decimates as the whole line would.
		const count = 8_000

		const xs = Array.from({ length: count }, (_, index) => (index / (count - 1)) * 800)

		const values = Array.from({ length: count }, (_, index) =>
			index % 1000 === 999 ? null : Math.sin(index / 20) * 40 + 50,
		)

		const geometry = lineGeometry(values, xs, identity, 100)

		expect(geometry.segments).toHaveLength(8)

		for (const [index, segment] of geometry.segments.entries()) {
			const drawn = (segment.match(/L /g)?.length ?? 0) + 1

			expect(drawn).toBeLessThan((geometry.runs[index]?.length ?? 0) / 2)
		}
	})
})

describe('hasIsolatedPoint', () => {
	it('finds a point with a gap or an end on each side', () => {
		expect(hasIsolatedPoint([1, 2, null, 4, null])).toBe(true)

		expect(hasIsolatedPoint([7, null, 1, 2])).toBe(true)

		expect(hasIsolatedPoint([5])).toBe(true)
	})

	it('finds none where every point joins a segment', () => {
		expect(hasIsolatedPoint([1, 2, null, 4, 5])).toBe(false)

		expect(hasIsolatedPoint([null, null])).toBe(false)

		expect(hasIsolatedPoint([])).toBe(false)
	})
})
