// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { sparklineGeometry } from '../../components/sparkline/sparkline-geometry'

describe('sparklineGeometry', () => {
	const box = { width: 100, height: 40, padding: 2, barGap: 1 }

	it('spreads points across the inner width and inverts value to y', () => {
		const geo = sparklineGeometry([0, 10], { ...box })

		// First point at the left inset, last at the right inset.
		expect(geo.points[0]?.x).toBe(2)

		expect(geo.points[1]?.x).toBe(98)

		// Lower value sits at the baseline, higher at the top inset.
		expect(geo.points[0]?.y).toBeGreaterThan(geo.points[1]?.y ?? 0)

		expect(geo.line.startsWith('M')).toBe(true)

		expect(geo.line).toContain('L')
	})

	it('maps a flat series to the vertical middle rather than dividing by zero', () => {
		const geo = sparklineGeometry([5, 5, 5], { ...box })

		for (const point of geo.points) expect(point.y).toBe(20)
	})

	it('draws a single point as a flat line across the box', () => {
		const geo = sparklineGeometry([7], { ...box })

		expect(geo.points).toHaveLength(1)

		expect(geo.line).toBe('M 2 20 L 98 20')
	})

	it('puts the end point of a lone drawn point at the end of its flat line', () => {
		expect(sparklineGeometry([7], { ...box }).last).toEqual({ x: 98, y: 20 })

		// One finite datum among non-finite ones also draws the full-width line.
		expect(sparklineGeometry([Number.NaN, 7, Number.NaN], { ...box }).last).toEqual({
			x: 98,
			y: 20,
		})
	})

	it('emits a bar per datum, floored so the minimum still shows', () => {
		const geo = sparklineGeometry([0, 10], { ...box, minBarHeight: 1 })

		expect(geo.bars).toHaveLength(2)

		// The min-value bar keeps a 1-unit sliver instead of vanishing.
		expect(geo.bars[0]?.height).toBe(1)

		expect(geo.bars[1]?.height).toBeGreaterThan(1)
	})

	it('drops a non-finite vertex from the drawn marks instead of emitting an invalid path', () => {
		const geo = sparklineGeometry([1, Number.NaN, 3], { ...box })

		// The NaN vertex is skipped (not `L 50 NaN`), so the browser renders the
		// finite endpoints instead of aborting the whole line, and no NaN bar emits.
		expect(geo.line).not.toContain('NaN')

		expect(geo.line).toBe('M 2 38 L 98 2')

		expect(geo.bars).toHaveLength(2)

		// The surviving bars keep their datum positions, which is what the rects key on.
		expect(geo.bars.map((bar) => bar.index)).toEqual([0, 2])
	})

	it('drops ±Infinity from the drawn marks instead of pinning a vertex to an edge', () => {
		const geo = sparklineGeometry([1, Number.POSITIVE_INFINITY, 3], { ...box })

		// Infinity is outside the finite domain; it must not clamp to the top and
		// draw a spurious vertex — the line bridges across it, exactly like a NaN.
		expect(geo.line).toBe('M 2 38 L 98 2')

		expect(geo.bars).toHaveLength(2)
	})

	it('closes a single-point area as a full-width band, not a center triangle', () => {
		const geo = sparklineGeometry([7], { ...box })

		// Closes on the track edges (2 → 98) to match the forced full-width line,
		// rather than the point's center x, which would fill as a triangle.
		expect(geo.area).toBe('M 2 20 L 98 20 L 98 38 L 2 38 Z')
	})

	it('closes a multi-point area on the outermost drawn points, not the box corner', () => {
		// Trailing NaN: the drawn line stops at the last finite point (x=50), so
		// the fill must close there — not run a wedge out to the right edge (x=98)
		// with no line above it.
		const geo = sparklineGeometry([1, 3, Number.NaN], { ...box })

		expect(geo.area).toBe('M 2 38 L 50 2 L 50 38 L 2 38 Z')

		expect(geo.area).not.toContain('98')
	})

	it('returns empty marks for an empty series', () => {
		const geo = sparklineGeometry([], { ...box })

		expect(geo.line).toBe('')

		expect(geo.bars).toHaveLength(0)

		expect(geo.last).toBeNull()
	})
})
