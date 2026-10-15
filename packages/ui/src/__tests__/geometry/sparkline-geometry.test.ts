// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { sparklineGeometry } from '../../components/sparkline/sparkline-geometry'
import { FLOAT } from '../helpers/geometry/tolerance'

describe('sparklineGeometry', () => {
	const box = { width: 100, height: 40, padding: 2, barGap: 1 }

	it('spreads points across the inner width and inverts value to y', () => {
		const geometry = sparklineGeometry([0, 10], { ...box })

		// First point at the left inset, last at the right inset.
		expect(geometry.points[0]?.x).toBe(2)

		expect(geometry.points[1]?.x).toBe(98)

		// Lower value sits at the baseline, higher at the top inset.
		expect(geometry.points[0]?.y).toBeGreaterThan(geometry.points[1]?.y ?? 0)

		expect(geometry.line.startsWith('M')).toBe(true)

		expect(geometry.line).toContain('L')
	})

	it('maps a flat series to the vertical middle rather than dividing by zero', () => {
		const geometry = sparklineGeometry([5, 5, 5], { ...box })

		for (const point of geometry.points) expect(point.y).toBe(20)
	})

	it('draws a single point as a flat line across the box', () => {
		const geometry = sparklineGeometry([7], { ...box })

		expect(geometry.points).toHaveLength(1)

		expect(geometry.line).toBe('M 2 20 L 98 20')
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
		const geometry = sparklineGeometry([0, 10], { ...box, minBarHeight: 1 })

		expect(geometry.bars).toHaveLength(2)

		// The min-value bar keeps a 1-unit sliver instead of vanishing.
		expect(geometry.bars[0]?.height).toBe(1)

		expect(geometry.bars[1]?.height).toBeGreaterThan(1)
	})

	it('drops a non-finite vertex from the drawn marks instead of emitting an invalid path', () => {
		const geometry = sparklineGeometry([1, Number.NaN, 3], { ...box })

		// The NaN vertex is skipped (not `L 50 NaN`), so the browser renders the
		// finite endpoints instead of aborting the whole line, and no NaN bar emits.
		expect(geometry.line).not.toContain('NaN')

		expect(geometry.line).toBe('M 2 38 L 98 2')

		expect(geometry.bars).toHaveLength(2)

		// The surviving bars keep their datum positions, which is what the rects key on.
		expect(geometry.bars.map((bar) => bar.index)).toEqual([0, 2])
	})

	it('drops ±Infinity from the drawn marks instead of pinning a vertex to an edge', () => {
		const geometry = sparklineGeometry([1, Number.POSITIVE_INFINITY, 3], { ...box })

		// Infinity is outside the finite domain; it must not clamp to the top and
		// draw a spurious vertex — the line bridges across it, exactly like a NaN.
		expect(geometry.line).toBe('M 2 38 L 98 2')

		expect(geometry.bars).toHaveLength(2)
	})

	it('closes a single-point area as a full-width band, not a center triangle', () => {
		const geometry = sparklineGeometry([7], { ...box })

		// Closes on the track edges (2 → 98) to match the forced full-width line,
		// rather than the point's center x, which would fill as a triangle.
		expect(geometry.area).toBe('M 2 20 L 98 20 L 98 38 L 2 38 Z')
	})

	it('closes a multi-point area on the outermost drawn points, not the box corner', () => {
		// Trailing NaN: the drawn line stops at the last finite point (x=50), so
		// the fill must close there — not run a wedge out to the right edge (x=98)
		// with no line above it.
		const geometry = sparklineGeometry([1, 3, Number.NaN], { ...box })

		expect(geometry.area).toBe('M 2 38 L 50 2 L 50 38 L 2 38 Z')

		expect(geometry.area).not.toContain('98')
	})

	it('grows bars from zero when the domain crosses zero', () => {
		const geometry = sparklineGeometry([-3, 2, -1, 4], { ...box })

		// Zero sits 3/7 of the way up the 36-unit inner height, from y = 38.
		const zero = 38 - (3 / 7) * 36

		expect(geometry.baseline).toBeNear(zero, FLOAT)

		const [low, up, dip, high] = geometry.bars

		// A negative value hangs below the zero line, and the most negative is the longest.
		expect(low?.y).toBeNear(zero, FLOAT)

		expect(dip?.y).toBeNear(zero, FLOAT)

		expect(low?.height).toBeGreaterThan(dip?.height ?? 0)

		expect((low?.y ?? 0) + (low?.height ?? 0)).toBeNear(38, FLOAT)

		// A positive value stands on the zero line.
		expect((up?.y ?? 0) + (up?.height ?? 0)).toBeNear(zero, FLOAT)

		expect((high?.y ?? 0) + (high?.height ?? 0)).toBeNear(zero, FLOAT)

		expect(high?.y).toBeNear(2, FLOAT)
	})

	it('hangs the bars from the top edge when every value is negative', () => {
		const geometry = sparklineGeometry([-4, -1], { ...box, minBarHeight: 1 })

		// Zero is above the domain, so it clamps to the top edge.
		expect(geometry.baseline).toBe(2)

		// The value nearest zero keeps a sliver below the top edge.
		expect(geometry.bars[1]).toMatchObject({ y: 2, height: 1 })

		expect(geometry.bars[0]).toMatchObject({ y: 2, height: 36 })
	})

	it('hangs a flat negative series from the top edge', () => {
		const geometry = sparklineGeometry([-5, -5], { ...box })

		expect(geometry.baseline).toBe(2)

		expect(geometry.bars[0]).toMatchObject({ y: 2, height: 18 })
	})

	it('keeps the sliver of a value outside a pinned domain inside the box', () => {
		const geometry = sparklineGeometry([-5, 20], { ...box, min: 10, minBarHeight: 1 })

		// The domain is above zero, so the bars stand on the bottom edge.
		expect(geometry.baseline).toBe(38)

		expect(geometry.bars[0]).toMatchObject({ y: 37, height: 1 })
	})

	it('clamps a series below a pinned floor to the bottom edge', () => {
		const geometry = sparklineGeometry([1, 5, 3], { ...box, min: 10, minBarHeight: 1 })

		// Each value is below the floor, so each point sits on the bottom inset.
		expect(geometry.points.map((point) => point.y)).toEqual([38, 38, 38])

		expect(geometry.bars[0]).toMatchObject({ y: 37, height: 1 })
	})

	it('clamps a series above a pinned ceiling to the top edge', () => {
		const geometry = sparklineGeometry([-1, -5, -3], { ...box, max: -10, minBarHeight: 1 })

		// Each value is above the ceiling, so each point sits on the top inset.
		expect(geometry.points.map((point) => point.y)).toEqual([2, 2, 2])

		expect(geometry.bars[0]).toMatchObject({ y: 2, height: 1 })
	})

	it('closes the area on the zero line when the domain crosses zero', () => {
		const geometry = sparklineGeometry([-1, 1], { ...box })

		expect(geometry.area).toBe('M 2 38 L 98 2 L 98 20 L 2 20 Z')
	})

	it('returns empty marks for an empty series', () => {
		const geometry = sparklineGeometry([], { ...box })

		expect(geometry.line).toBe('')

		expect(geometry.bars).toHaveLength(0)

		expect(geometry.last).toBeNull()
	})
})
