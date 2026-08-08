import { describe, expect, it } from 'vitest'
import { numericRegionData } from '../../modules/map/engine/map-region/data'

type Row = { region: string; pop: number }

const ROWS: Row[] = [
	{ region: 'A', pop: 0 },
	{ region: 'B', pop: 100 },
]

const RANGE = ['#dbeafe', '#1e3a8a']

/** The four fields the numeric branch requires, as a caller that has them all holds them. */
const WHOLE = { data: ROWS, regionKey: 'region', valueKey: 'pop', colorRange: RANGE } as const

describe('numericRegionData', () => {
	it('returns the numeric branch when the rows, both keys, and the ramp are present', () => {
		expect(numericRegionData<Row>({ ...WHOLE })).toEqual(WHOLE)
	})

	it('carries the branch’s optional fields through untouched', () => {
		const valueFormat = (value: number) => `${value}%`

		expect(
			numericRegionData<Row>({
				...WHOLE,
				bins: 5,
				binning: 'quantile',
				domain: [0, 100],
				valueName: 'Population',
				valueFormat,
			}),
		).toEqual({
			...WHOLE,
			bins: 5,
			binning: 'quantile',
			domain: [0, 100],
			valueName: 'Population',
			valueFormat,
		})
	})

	// Each of the four alone decides the branch: without any one of them there is
	// no scale to shade by, so the map falls to its neutral fill.
	it.each([
		['rows', { ...WHOLE, data: undefined }],
		['join key', { ...WHOLE, regionKey: undefined }],
		['value key', { ...WHOLE, valueKey: undefined }],
		['ramp', { ...WHOLE, colorRange: undefined }],
	])('returns the data-less map with no %s', (_missing, fields) => {
		expect(numericRegionData<Row>(fields)).toEqual({})
	})

	it('drops the rows it was given on the data-less branch', () => {
		// The guarantee the choropleth's spread rests on: a caller spreads the
		// result over its own props, so a branch that returned `data` back would
		// leave a data-less map holding rows it has no key to join.
		expect(numericRegionData<Row>({ data: ROWS })).not.toHaveProperty('data')
	})
})
