import { describe, expect, it } from 'vitest'
import { addressQueries, withoutUnit } from '../../components/place-form-drawer/place-address-query'

describe('withoutUnit', () => {
	it('removes the unit and keeps the rest as typed', () => {
		expect(withoutUnit('16784 SW Edy Rd Unit 103, Sherwood, OR 97140')).toBe(
			'16784 SW Edy Rd, Sherwood, OR 97140',
		)

		expect(withoutUnit('16784 SW Edy Rd Unit 103 Sherwood OR 97140')).toBe(
			'16784 SW Edy Rd Sherwood OR 97140',
		)
	})

	it('removes each form of a unit', () => {
		expect(withoutUnit('100 Main St Apt. 4B, Bend')).toBe('100 Main St, Bend')

		expect(withoutUnit('100 Main St #12, Bend')).toBe('100 Main St, Bend')

		expect(withoutUnit('Suite A, 100 Main St, Bend')).toBe('100 Main St, Bend')
	})

	it('keeps the words that only look like a unit', () => {
		expect(withoutUnit('1 Market St, Ste. Genevieve, MO')).toBe('1 Market St, Ste. Genevieve, MO')

		expect(withoutUnit('12 Steele St, Denver')).toBe('12 Steele St, Denver')

		expect(withoutUnit('1 Ocean Dr, Miami, FL 33139')).toBe('1 Ocean Dr, Miami, FL 33139')
	})
})

describe('addressQueries', () => {
	it('searches the typed address, then the address without its unit', () => {
		expect(addressQueries(' 16784 SW Edy Rd Unit 103, Sherwood ')).toEqual([
			'16784 SW Edy Rd Unit 103, Sherwood',
			'16784 SW Edy Rd, Sherwood',
		])
	})

	it('searches once where the address has no unit', () => {
		expect(addressQueries('16784 SW Edy Rd, Sherwood')).toEqual(['16784 SW Edy Rd, Sherwood'])
	})
})
