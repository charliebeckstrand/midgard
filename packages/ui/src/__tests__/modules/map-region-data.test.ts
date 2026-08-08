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
		const dressed = {
			...WHOLE,
			bins: 5,
			binning: 'quantile' as const,
			domain: [0, 100] as [number, number],
			valueName: 'Population',
			valueFormat: (value: number) => `${value}%`,
		}

		expect(numericRegionData<Row>(dressed)).toEqual(dressed)
	})

	// Each of the four required fields alone decides the branch: without any one
	// of them there is no scale to shade by, so the map falls to its neutral
	// fill. `toEqual({})` is what the assertion turns on — the rows go back with
	// the rest, which is the guarantee the choropleth's spread rests on. A caller
	// spreads the result over its own props, so a branch that handed `data` back
	// would leave a data-less map holding rows it has no key to join.
	it.each([
		['rows', { ...WHOLE, data: undefined }],
		['join key', { ...WHOLE, regionKey: undefined }],
		['value key', { ...WHOLE, valueKey: undefined }],
		['ramp', { ...WHOLE, colorRange: undefined }],
		['series at all, rows alone', { data: ROWS }],
	])('returns the data-less map with no %s', (_missing, fields) => {
		expect(numericRegionData<Row>(fields)).toEqual({})
	})
})
