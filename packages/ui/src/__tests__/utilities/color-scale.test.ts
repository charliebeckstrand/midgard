import { describe, expect, it } from 'vitest'
import {
	binColors,
	binIndex,
	quantileBinIndex,
	quantileThresholds,
	resolveColorBins,
	resolveQuantileBins,
	sampleRange,
	valueExtent,
} from '../../utilities/color-scale'

describe('sampleRange', () => {
	it('returns exact stops verbatim and interpolates between them in sRGB', () => {
		const range = ['#0000ff', '#00ff00', '#ff0000']

		expect(sampleRange(range, 0)).toBe('#0000ff')

		expect(sampleRange(range, 1)).toBe('#ff0000')

		// The middle sample lands on the middle stop — verbatim, not re-encoded.
		expect(sampleRange(range, 0.5)).toBe('#00ff00')

		// A sample between stops mixes in sRGB.
		expect(sampleRange(['#000000', '#ffffff'], 0.5)).toBe('rgb(128 128 128)')
	})

	it('clamps out-of-range t and passes a single stop through', () => {
		expect(sampleRange(['#0000ff', '#ff0000'], -1)).toBe('#0000ff')

		expect(sampleRange(['#0000ff', '#ff0000'], 2)).toBe('#ff0000')

		expect(sampleRange(['#123456'], 0.7)).toBe('#123456')
	})

	it('interpolates non-hex stops through the shared colour parser', () => {
		// rgb() stops mix the same as their hex equivalents — the parser folds both.
		expect(sampleRange(['rgb(0 0 0)', 'rgb(255 255 255)'], 0.5)).toBe('rgb(128 128 128)')
	})
})

describe('binColors', () => {
	it('samples n colours across the range, ends inclusive', () => {
		expect(binColors(['#000000', '#ffffff'], 3)).toEqual(['#000000', 'rgb(128 128 128)', '#ffffff'])
	})

	it('collapses to a single low sample for one bin', () => {
		expect(binColors(['#000000', '#ffffff'], 1)).toEqual(['#000000'])
	})
})

describe('valueExtent', () => {
	it('takes the finite min and max, ignoring non-finite entries', () => {
		expect(valueExtent([3, Number.NaN, 1, 9])).toEqual([1, 9])
	})

	it('honours an explicit override and reads null when nothing is finite', () => {
		expect(valueExtent([1, 2], [0, 100])).toEqual([0, 100])

		expect(valueExtent([Number.NaN])).toBeNull()
	})
})

describe('resolveColorBins', () => {
	it('quantises the domain into equal-interval bins pinned to the max', () => {
		const bins = resolveColorBins([0, 100], ['#000000', '#ffffff'])

		expect(bins).toHaveLength(2)

		expect(bins[0]).toEqual({ color: '#000000', lo: 0, hi: 50 })

		expect(bins[1]).toEqual({ color: '#ffffff', lo: 50, hi: 100 })
	})

	it('resamples the ramp when an explicit bin count differs from the stops', () => {
		const bins = resolveColorBins([0, 90], ['#000000', '#ffffff'], 3)

		expect(bins.map((bin) => bin.color)).toEqual(['#000000', 'rgb(128 128 128)', '#ffffff'])

		expect(bins.at(-1)?.hi).toBe(90)
	})
})

describe('binIndex', () => {
	it('places a value in its bucket, clamping the top edge into the last bin', () => {
		expect(binIndex(0, [0, 100], 4)).toBe(0)

		expect(binIndex(50, [0, 100], 4)).toBe(2)

		expect(binIndex(100, [0, 100], 4)).toBe(3)
	})

	it('reads null for a non-finite value or a non-positive count, and bin 0 for a flat domain', () => {
		expect(binIndex(Number.NaN, [0, 100], 4)).toBeNull()

		expect(binIndex(5, [0, 100], 0)).toBeNull()

		expect(binIndex(50, [50, 50], 4)).toBe(0)
	})
})

describe('quantileThresholds', () => {
	it('cuts count-1 interior edges at the i/count quantiles of the sorted values', () => {
		// 0..10 into 5 buckets: edges at the 20/40/60/80th percentiles.
		expect(quantileThresholds([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toEqual([2, 4, 6, 8])
	})

	it('returns no edges for a flat domain or fewer than two buckets — a single bin', () => {
		expect(quantileThresholds([7, 7, 7], 5)).toEqual([])

		expect(quantileThresholds([1, 2, 3], 1)).toEqual([])

		expect(quantileThresholds([], 5)).toEqual([])
	})

	it('ignores non-finite values when ranking', () => {
		expect(quantileThresholds([0, Number.NaN, 10], 2)).toEqual([5])
	})
})

describe('quantileBinIndex', () => {
	it('counts the thresholds a value meets or exceeds — an edge reads into the upper bin', () => {
		const thresholds = [2, 4, 6, 8]

		expect(quantileBinIndex(1, thresholds)).toBe(0)

		expect(quantileBinIndex(2, thresholds)).toBe(1) // on the edge → up

		expect(quantileBinIndex(5, thresholds)).toBe(2)

		expect(quantileBinIndex(100, thresholds)).toBe(4)
	})

	it('reads null for a non-finite value and bin 0 with no thresholds', () => {
		expect(quantileBinIndex(Number.NaN, [2, 4])).toBeNull()

		expect(quantileBinIndex(42, [])).toBe(0)
	})
})

describe('resolveQuantileBins', () => {
	it('paints one bin per bucket with edges from the quantile thresholds', () => {
		const { bins, thresholds } = resolveQuantileBins(
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
			['#000000', '#ffffff'],
			5,
		)

		expect(thresholds).toEqual([2, 4, 6, 8])

		expect(bins).toHaveLength(5)

		// Edges are min, the thresholds, then max.
		expect(bins.map((bin) => [bin.lo, bin.hi])).toEqual([
			[0, 2],
			[2, 4],
			[4, 6],
			[6, 8],
			[8, 10],
		])

		expect(bins[0]?.color).toBe('#000000')

		expect(bins.at(-1)?.color).toBe('#ffffff')
	})

	it('collapses to a single bin over the extent when the domain is flat', () => {
		const { bins, thresholds } = resolveQuantileBins([7, 7, 7], ['#000000', '#ffffff'], 5)

		expect(thresholds).toEqual([])

		expect(bins).toHaveLength(1)

		expect(bins[0]).toMatchObject({ lo: 7, hi: 7 })
	})
})
