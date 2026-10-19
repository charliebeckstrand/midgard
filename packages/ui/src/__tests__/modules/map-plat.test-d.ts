import states from 'us-atlas/states-10m.json'
import { describe, expectTypeOf, it } from 'vitest'
import type {
	DataKey,
	MapGeography,
	MapPlatCategoricalProps,
	MapPlatNoDataProps,
	MapPlatNumericProps,
	MapPlatProps,
} from '../../modules/map'

describe('MapPlat', () => {
	it('exports a props type for each form of its region data', () => {
		type Row = { state: string; zone: string; count: number }

		expectTypeOf<MapPlatCategoricalProps<Row>>().toExtend<MapPlatProps<Row>>()
		expectTypeOf<MapPlatNumericProps<Row>>().toExtend<MapPlatProps<Row>>()
		expectTypeOf<MapPlatNoDataProps>().toExtend<MapPlatProps<Row>>()
		expectTypeOf<MapPlatCategoricalProps<Row>['categoryKey']>().toEqualTypeOf<DataKey<Row>>()
		expectTypeOf<MapPlatNumericProps<Row>['valueKey']>().toEqualTypeOf<DataKey<Row>>()
		expectTypeOf<MapPlatNoDataProps['data']>().toEqualTypeOf<undefined>()
	})

	it('takes an atlas imported as JSON with no cast', () => {
		expectTypeOf(states).toExtend<MapGeography>()
	})
})
