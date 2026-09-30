// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	anchorEndTicks,
	diameterRange,
	scatterMarkAt,
	sizeDomain,
	sizeRadius,
	uniqueXValues,
} from '../../modules/chart/engine/chart-geometry/scatter'
import { nearestStopIndex } from '../../modules/chart/engine/chart-snap'

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

	it('folds the size extent of any count of points', () => {
		// A spread into `Math.min` throws past the engine's argument limit.
		const many = Array.from({ length: 500_000 }, (_, row) => ({
			x: row,
			y: row,
			row,
			size: row % 7 === 0 ? null : row,
		}))

		expect(sizeDomain(many)).toEqual([1, 499_999])

		expect(sizeDomain([{ x: 0, y: 0, row: 0, size: null }])).toBeNull()
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

		// Decisively onto the other disc — under half the held distance — it flips.
		expect(scatterMarkAt(marks, 37, 10, 100, { series: 0, datum: 0 })?.datum).toBe(1)
	})

	it('resolves the nearest center however unevenly they sit', () => {
		expect(nearestStopIndex([0, 10, 100], 9)).toBe(1)

		expect(nearestStopIndex([0, 10, 100], 60)).toBe(2)

		expect(nearestStopIndex([], 5)).toBeNull()
	})

	it('scales bubble radii by area between the diameter range ends', () => {
		const diameters = diameterRange(8, 28)

		const small = sizeRadius(1, [1, 100], diameters)

		const large = sizeRadius(100, [1, 100], diameters)

		expect(small).toBeCloseTo(4)

		expect(large).toBeCloseTo(14)

		// Area-true: a quarter of the size is half the radius span, not a quarter.
		expect(sizeRadius(25, [0, 100], diameters)).toBeCloseTo(4 + (14 - 4) / 2)
	})

	it('reads equal sizes as mid-range and a sizeless point as smallest', () => {
		const diameters = diameterRange(8, 28)

		expect(sizeRadius(7, [7, 7], diameters)).toBeCloseTo(9)

		expect(sizeRadius(null, [1, 100], diameters)).toBeCloseTo(4)
	})

	it('draws a zero size at the smallest diameter and a negative size as no disc', () => {
		const diameters = diameterRange(8, 28)

		// Every size is zero, so the extent collapses. The discs still read smallest, not mid-range.
		expect(sizeRadius(0, [0, 0], diameters)).toBeCloseTo(4)

		expect(sizeRadius(-3, [0, 16], diameters)).toBe(0)
	})

	it('leaves a negative size out of the size extent', () => {
		const sized = [-5, 4, 16].map((size, row) => ({ x: row, y: row, row, size }))

		expect(sizeDomain(sized)).toEqual([4, 16])
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
		// A pinned floor sits at range 40, so the first tick at 60 is interior — only
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
