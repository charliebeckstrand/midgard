// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { lineGeometry } from '../../modules/chart/engine/chart-geometry/line'

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

		const ys = [...(smooth.segments[0] as string).matchAll(/[\d.]+ ([\d.]+)/g)].map((m) =>
			Number(m[1]),
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
		const geo = lineGeometry([1, 2, 3], [0, 400, 800], identity, 100)

		expect(geo.segments[0]).toBe('M 0 1 L 400 2 L 800 3')
	})

	it('decimates a dense run for drawing while keeping data full-resolution', () => {
		// 8,000 points across an 800px span is ten per pixel — far denser than the
		// plot can show, so the drawn path collapses to the per-column envelope.
		const n = 8_000

		const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * 800)

		const values = Array.from({ length: n }, (_, i) => Math.sin(i / 20) * 40 + 50)

		// An unmistakable single-column spike that decimation must keep.
		values[1234] = 9999

		const geo = lineGeometry(values, xs, identity, 100)

		const drawn = (geo.segments[0]?.match(/L /g)?.length ?? 0) + 1

		// The drawn path is a fraction of the data…
		expect(drawn).toBeLessThan(n / 2)

		// …the spike survives it…
		expect(geo.segments[0]).toContain('9999')

		// …the endpoints are exact…
		expect(geo.segments[0]?.startsWith('M 0 ')).toBe(true)

		// …and the hit-test / marker / table run keeps every point.
		expect(geo.runs[0]).toHaveLength(n)

		expect(geo.points).toHaveLength(n)
	})

	it('decimates each dense run that a gap splits off', () => {
		// A null in every thousand points splits the line into runs, each still ten
		// points to a pixel. Each run decimates as the whole line would.
		const n = 8_000

		const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * 800)

		const values = Array.from({ length: n }, (_, i) =>
			i % 1000 === 999 ? null : Math.sin(i / 20) * 40 + 50,
		)

		const geo = lineGeometry(values, xs, identity, 100)

		expect(geo.segments).toHaveLength(8)

		for (const [index, segment] of geo.segments.entries()) {
			const drawn = (segment.match(/L /g)?.length ?? 0) + 1

			expect(drawn).toBeLessThan((geo.runs[index]?.length ?? 0) / 2)
		}
	})
})
