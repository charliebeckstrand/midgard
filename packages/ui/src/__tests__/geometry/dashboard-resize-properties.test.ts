// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import {
	clampSpan,
	type DashboardCell,
	deriveHeight,
	fits,
	heightAt,
} from '../../modules/dashboard/engine/dashboard-layout'
import {
	type DashboardResizeLimits,
	resizePreview,
	resizeRange,
} from '../../modules/dashboard/engine/dashboard-resize'
import { cell } from '../helpers/dashboard-cells'

// The tables of `dashboard-resize.test.ts` hold the documented examples. The
// properties below read the resize clamp over generated boards and limits.

/**
 * A board with no overlap. Each candidate cell is kept only when it fits the
 * cells before it, so the board is one that a gesture can reach.
 */
const clearBoard = () =>
	fc
		.record({
			columns: fc.integer({ min: 1, max: 24 }),
			candidates: fc.array(
				fc.record({
					x: fc.nat({ max: 23 }),
					y: fc.nat({ max: 12 }),
					w: fc.integer({ min: 1, max: 8 }),
					h: fc.integer({ min: 1, max: 8 }),
					fixed: fc.nat({ max: 4 }).map((roll) => roll === 0),
				}),
				// A dense board puts a neighbor in the path of most resizes.
				{ minLength: 1, maxLength: 16 },
			),
		})
		.map(({ columns, candidates }) => {
			const cells: DashboardCell[] = []

			for (const { x, y, w, h, fixed } of candidates) {
				const span = Math.min(w, columns)

				const next = cell(`t${cells.length}`, x % (columns - span + 1), y, span, h, fixed)

				if (fits(cells, next, columns)) cells.push(next)
			}

			return { columns, cells }
		})

/**
 * The limits of one resize, less the column count. A minimum can pass the
 * maximum and the edge of the board, as the props of a tile can.
 */
const limitsFor = (columns: number): fc.Arbitrary<DashboardResizeLimits> =>
	fc.record(
		{
			columns: fc.constant(columns),
			minW: fc.oneof(fc.integer({ min: 1, max: 2 }), fc.integer({ min: 1, max: columns + 4 })),
			maxW: fc.integer({ min: 1, max: columns + 4 }),
			minH: fc.integer({ min: 1, max: 16 }),
			maxH: fc.integer({ min: 1, max: 24 }),
			ratio: fc.constantFrom(0.5, 1, 4 / 3, 16 / 9, 3),
		},
		{ requiredKeys: ['columns', 'minW'] },
	)

/** One resize: a board, the tile that it resizes, the target span, and the limits. */
const resize = () =>
	clearBoard().chain(({ columns, cells }) =>
		fc.record({
			columns: fc.constant(columns),
			cells: fc.constant(cells),
			origin: fc.constantFrom(...cells),
			w: fc.integer({ min: -4, max: 40 }),
			h: fc.integer({ min: -4, max: 40 }),
			limits: limitsFor(columns),
		}),
	)

/**
 * One resize of a tile with a neighbor to its right and a neighbor under it,
 * each in its path. A resize toward a large span then meets a neighbor on each
 * axis, and the back-off has work to do.
 */
const crowdedResize = () =>
	fc
		.record({
			columns: fc.integer({ min: 8, max: 24 }),
			x: fc.nat({ max: 4 }),
			y: fc.nat({ max: 6 }),
			w: fc.integer({ min: 1, max: 3 }),
			h: fc.integer({ min: 1, max: 4 }),
			rightGap: fc.nat({ max: 3 }),
			rightRow: fc.nat({ max: 3 }),
			belowGap: fc.nat({ max: 3 }),
			belowColumn: fc.nat({ max: 2 }),
		})
		.chain(({ columns, x, y, w, h, rightGap, rightRow, belowGap, belowColumn }) => {
			const origin = cell('o', x, y, w, h)

			const right = cell('r', x + w + rightGap, y + (rightRow % h), 2, 3)

			const below = cell('b', x + (belowColumn % w), y + h + belowGap, 2, 2)

			const cells = [origin, right, below].filter((target, index, all) =>
				fits(all.slice(0, index), target, columns),
			)

			return fc.record({
				columns: fc.constant(columns),
				cells: fc.constant(cells),
				origin: fc.constant(origin),
				w: fc.integer({ min: 1, max: 30 }),
				h: fc.integer({ min: 1, max: 30 }),
				limits: limitsFor(columns),
			})
		})

const anyResize = () => fc.oneof(resize(), crowdedResize())

describe('resizeRange · properties', () => {
	test.prop([
		fc
			.integer({ min: 1, max: 24 })
			.chain((columns) => fc.tuple(limitsFor(columns), fc.integer({ min: 0, max: columns - 1 }))),
	])('orders each span range inside the right edge', ([limits, x]) => {
		const room = limits.columns - x

		const range = resizeRange(limits, x)

		expect(range.minW).toBeGreaterThanOrEqual(1)

		expect(range.maxW).toBeGreaterThanOrEqual(range.minW)

		expect(range.maxW).toBeLessThanOrEqual(room)

		expect(range.minH).toBeGreaterThanOrEqual(1)

		if (range.maxH !== undefined) expect(range.maxH).toBeGreaterThanOrEqual(range.minH)

		// A tile with a fixed ratio has no free height, so it reads no height limit.
		if (limits.ratio !== undefined) expect(range).toMatchObject({ minH: 1, maxH: undefined })
	})
})

describe('resizePreview · properties', () => {
	test.prop([anyResize()])(
		'changes the resized tile only, and never a static one',
		({ cells, origin, w, h, limits }) => {
			const next = resizePreview(cells, origin.id, w, h, limits)

			if (origin.static) expect(next).toBeNull()

			if (next === null) return

			for (const [index, before] of cells.entries()) {
				if (before.id !== origin.id) expect(next[index]).toBe(before)
			}

			expect(next.find((target) => target.id === origin.id)).toMatchObject({
				x: origin.x,
				y: origin.y,
				static: false,
			})
		},
	)

	test.prop([anyResize()])(
		'gives a span inside the resize range that fits the board',
		({ columns, cells, origin, w, h, limits }) => {
			const next = resizePreview(cells, origin.id, w, h, limits)

			if (next === null) return

			const resized = next.find((target) => target.id === origin.id) as DashboardCell

			const range = resizeRange(limits, origin.x)

			expect(resized.w).toBeGreaterThanOrEqual(range.minW)

			expect(resized.w).toBeLessThanOrEqual(range.maxW)

			if (limits.ratio === undefined) {
				expect(resized.h).toBeGreaterThanOrEqual(range.minH)

				if (range.maxH !== undefined) expect(resized.h).toBeLessThanOrEqual(range.maxH)
			} else {
				expect(resized.h).toBe(deriveHeight(resized.w, limits.ratio))
			}

			expect(fits(cells, resized, columns)).toBe(true)
		},
	)

	// Each axis backs off one unit at a time until the cell fits. Thus one unit
	// more on an axis, up to the clamped target, does not fit.
	test.prop([anyResize()])(
		'stops each axis at the first unit that fits',
		({ columns, cells, origin, w, h, limits }) => {
			const next = resizePreview(cells, origin.id, w, h, limits)

			if (next === null) return

			const resized = next.find((target) => target.id === origin.id) as DashboardCell

			const range = resizeRange(limits, origin.x)

			if (resized.w < clampSpan(Math.round(w), range.minW, range.maxW)) {
				const wider = resized.w + 1

				const probe = { ...origin, w: wider, h: heightAt(wider, origin.h, limits.ratio) }

				expect(fits(cells, probe, columns)).toBe(false)
			}

			if (
				limits.ratio === undefined &&
				resized.h < clampSpan(Math.round(h), range.minH, range.maxH)
			) {
				expect(fits(cells, { ...resized, h: resized.h + 1 }, columns)).toBe(false)
			}
		},
	)
})
