// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	anchorEndTicks,
	diameterRange,
	scatterMarkAt,
	sizePeak,
	sizeRadius,
	uniqueXValues,
} from '../../modules/chart/engine/chart-geometry/scatter'
import { nearestStopIndex } from '../../modules/chart/engine/chart-snap'

/**
 * A bubble radius comes from a square root, so the case checks it to two
 * decimal places of a frame unit.
 */
const RADIUS_TOLERANCE = 0.005

describe('scatter geometry', () => {
	it('keys on the ascending unique x values across series', () => {
		expect(
			uniqueXValues([
				[{ x: 3, y: 1, row: 0, size: null }],
				[
					{ x: 1, y: 2, row: 0, size: null },
					{ x: 3, y: 4, row: 1, size: null },
				],
			]),
		).toEqual([1, 3])
	})

	it('resolves the disc under the pointer, the nearest center where discs overlap', () => {
		const marks = [
			[
				{ x: 10, y: 10, r: 5 },
				{ x: 40, y: 40, r: 5 },
			],
			[{ x: 12, y: 12, r: 5 }],
		]

		// On the second series' lone disc, clear of the rest.
		expect(scatterMarkAt(marks, 12, 12, 0)).toEqual({ series: 1, datum: 0 })

		// Between the two overlapping discs at (10,10) and (12,12): the nearer wins.
		expect(scatterMarkAt(marks, 10.5, 10.5, 0)).toEqual({ series: 0, datum: 0 })

		// Off every disc, past the edge slack.
		expect(scatterMarkAt(marks, 100, 100, 2)).toBeNull()
	})

	it('gives a shared point to the disc that paints on top', () => {
		// Two series share one point. The later disc draws over the earlier one, so
		// the pointer reads the disc the reader sees.
		const marks = [[{ x: 10, y: 10, r: 5 }], [{ x: 10, y: 10, r: 5 }]]

		expect(scatterMarkAt(marks, 10, 10, 0)).toEqual({ series: 1, datum: 0 })
	})

	it('folds the largest size of any count of points, across every series', () => {
		// A spread into `Math.max` throws past the engine's argument limit.
		const many = Array.from({ length: 500_000 }, (_, row) => ({
			x: row,
			y: row,
			row,
			size: row % 7 === 0 ? null : row,
		}))

		expect(sizePeak([many])).toBe(499_999)

		expect(sizePeak([[{ x: 0, y: 0, row: 0, size: null }]])).toBeNull()

		const sized = (sizes: number[]) => sizes.map((size, row) => ({ x: row, y: row, row, size }))

		expect(sizePeak([sized([1, 10]), sized([10, 100])])).toBe(100)
	})

	it('holds the emphasized disc across the midline until a challenger decisively closes', () => {
		// Discs at (10,10) and (40,10); the midline sits at x=25.
		const marks = [
			[
				{ x: 10, y: 10, r: 5 },
				{ x: 40, y: 10, r: 5 },
			],
		]

		// Just past the midline the held disc keeps the win.
		expect(scatterMarkAt(marks, 27, 10, 100, { series: 0, datum: 0 })?.datum).toBe(0)

		// Decisively onto the other disc (under half the held distance) it flips.
		expect(scatterMarkAt(marks, 37, 10, 100, { series: 0, datum: 0 })?.datum).toBe(1)
	})

	it('resolves the nearest center however unevenly they sit', () => {
		expect(nearestStopIndex([0, 10, 100], 9)).toBe(1)

		expect(nearestStopIndex([0, 10, 100], 60)).toBe(2)

		expect(nearestStopIndex([], 5)).toBeNull()
	})

	it('scales bubble areas with the size, from zero to the largest size', () => {
		const diameters = diameterRange(8, 28)

		expect(sizeRadius(100, 100, diameters)).toBeNear(14, RADIUS_TOLERANCE)

		// Area-true: a quarter of the size is a quarter of the area, so half the radius.
		expect(sizeRadius(25, 100, diameters)).toBeNear(7, RADIUS_TOLERANCE)

		// Sizes 1% apart draw areas 1% apart, not the two ends of the diameter range.
		const ratio = (sizeRadius(101, 101, diameters) / sizeRadius(100, 101, diameters)) ** 2

		expect(ratio).toBeNear(1.01, 0.0001)
	})

	it('floors a small size at the smallest diameter, and reads a sizeless point there too', () => {
		const diameters = diameterRange(8, 28)

		expect(sizeRadius(1, 100, diameters)).toBeNear(4, RADIUS_TOLERANCE)

		expect(sizeRadius(null, 100, diameters)).toBeNear(4, RADIUS_TOLERANCE)

		expect(sizeRadius(null, null, diameters)).toBeNear(4, RADIUS_TOLERANCE)
	})

	it('draws a zero size at the smallest diameter and a negative size as no disc', () => {
		const diameters = diameterRange(8, 28)

		// Every size is zero, so the peak is zero. The discs read smallest.
		expect(sizeRadius(0, 0, diameters)).toBeNear(4, RADIUS_TOLERANCE)

		expect(sizeRadius(-3, 16, diameters)).toBe(0)
	})

	it('leaves a negative size out of the largest size', () => {
		const sized = (sizes: number[]) => sizes.map((size, row) => ({ x: row, y: row, row, size }))

		expect(sizePeak([sized([-5, 4, 16])])).toBe(16)

		expect(sizePeak([sized([-5])])).toBeNull()
	})

	it('anchors the edge ticks inward and leaves interior ones centered', () => {
		const anchored = anchorEndTicks(
			[
				{ at: 40, label: '0', key: 0 },
				{ at: 120, label: '50', key: 50 },
				{ at: 200, label: '100', key: 100 },
			],
			40,
			200,
		)

		expect(anchored.map((tick) => tick.anchor)).toEqual(['start', undefined, 'end'])
	})

	it('leaves a tick sitting interior to a pinned edge centered', () => {
		// A pinned floor sits at range 40, so the first tick at 60 is interior, only
		// the tick that lands on an edge reads inward.
		const anchored = anchorEndTicks(
			[
				{ at: 60, label: '-40', key: -40 },
				{ at: 200, label: '100', key: 100 },
			],
			40,
			200,
		)

		expect(anchored.map((tick) => tick.anchor)).toEqual([undefined, 'end'])
	})
})
