import { describe, expect, it } from 'vitest'
import {
	regionValueIndexes,
	resolveValueBins,
	sampleRange,
} from '../../modules/map/map-value-scale'

type Row = { id: string; v: number }

const ROWS: Row[] = [
	{ id: 'a', v: 0 },
	{ id: 'b', v: 50 },
	{ id: 'c', v: 100 },
]

const round = (value: number) => value.toFixed(0)

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
})

describe('resolveValueBins', () => {
	it('quantises the extent into one bin per colour stop, painting each a CSS value', () => {
		const { metas, domain } = resolveValueBins(ROWS, 'v', {
			colorRange: ['#0a0a0a', '#f5f5f5'],
			format: round,
		})

		expect(domain).toEqual([0, 100])

		expect(metas).toHaveLength(2)

		expect(metas.map((meta) => meta.label)).toEqual(['0–50', '50–100'])

		expect(metas[0]?.paint).toEqual({ kind: 'value', color: '#0a0a0a' })

		expect(metas[1]?.paint).toEqual({ kind: 'value', color: '#f5f5f5' })
	})

	it('resamples the stops when an explicit bin count differs from the stop count', () => {
		const { metas } = resolveValueBins(ROWS, 'v', {
			colorRange: ['#000000', '#ffffff'],
			bins: 3,
			format: round,
		})

		expect(metas).toHaveLength(3)

		expect(metas[0]?.paint).toEqual({ kind: 'value', color: '#000000' })

		// The middle bin interpolates halfway between the two stops.
		expect(metas[1]?.paint).toEqual({ kind: 'value', color: 'rgb(128 128 128)' })

		expect(metas[2]?.paint).toEqual({ kind: 'value', color: '#ffffff' })
	})

	it('honours an explicit domain over the data extent', () => {
		const { domain } = resolveValueBins(ROWS, 'v', {
			colorRange: ['#000000', '#ffffff'],
			domain: [0, 200],
			format: round,
		})

		expect(domain).toEqual([0, 200])
	})

	it('treats a null or empty value as no-data, so it never drags the domain floor to zero', () => {
		type Loose = { id: string; v: number | null | string }

		const rows: Loose[] = [
			{ id: 'a', v: null },
			{ id: 'b', v: '' },
			{ id: 'c', v: 50 },
			{ id: 'd', v: 100 },
		]

		const { domain } = resolveValueBins(rows, 'v', {
			colorRange: ['#000000', '#ffffff'],
			format: round,
		})

		// A bare Number(null)/Number('') is 0 and would pull the extent to [0, 100];
		// the blanks are excluded, so the real minimum stands.
		expect(domain).toEqual([50, 100])
	})

	it('returns no bins and a null domain when no row carries a finite value', () => {
		const empty = resolveValueBins([{ id: 'a', v: Number.NaN }], 'v', {
			colorRange: ['#000000', '#ffffff'],
			format: round,
		})

		expect(empty.metas).toEqual([])

		expect(empty.domain).toBeNull()
	})
})

describe('regionValueIndexes', () => {
	it('bins each region by its value, clamping the top edge into the last bin', () => {
		expect(regionValueIndexes(['a', 'b', 'c'], ROWS, 'id', 'v', 3, [0, 100])).toEqual([0, 1, 2])
	})

	it('reads null for an unmatched region, a non-finite value, or no domain', () => {
		expect(regionValueIndexes(['x'], ROWS, 'id', 'v', 3, [0, 100])).toEqual([null])

		expect(regionValueIndexes(['a'], [{ id: 'a', v: Number.NaN }], 'id', 'v', 3, [0, 100])).toEqual(
			[null],
		)

		expect(regionValueIndexes(['a'], ROWS, 'id', 'v', 3, null)).toEqual([null])
	})

	it('reads null for a blank value rather than binning it as zero', () => {
		type Loose = { id: string; v: number | null | string }

		const rows: Loose[] = [
			{ id: 'a', v: null },
			{ id: 'b', v: '' },
			{ id: 'c', v: 100 },
		]

		// `null` and `''` are no-data (the neutral fill), not bin 0 — only the real
		// value bins.
		expect(regionValueIndexes(['a', 'b', 'c'], rows, 'id', 'v', 4, [0, 100])).toEqual([
			null,
			null,
			3,
		])
	})

	it('places every region in bin 0 when the domain has no span', () => {
		expect(regionValueIndexes(['a', 'b'], ROWS, 'id', 'v', 3, [50, 50])).toEqual([0, 0])
	})
})
