import { describe, expect, it } from 'vitest'
import { addressQueries, mapAddress } from '../../components/place-form-drawer/place-address-query'

describe('mapAddress', () => {
	it('removes the unit and writes the street words in full', () => {
		expect(mapAddress('16784 SW Edy Rd Unit 103, Sherwood, OR 97140')).toBe(
			'16784 Southwest Edy Road, Sherwood, OR 97140',
		)
	})

	it('removes each form of a unit', () => {
		expect(mapAddress('100 Main St Apt. 4B, Bend')).toBe('100 Main Street, Bend')

		expect(mapAddress('100 Main St #12, Bend')).toBe('100 Main Street, Bend')

		expect(mapAddress('Suite A, 100 Main St, Bend')).toBe('100 Main Street, Bend')
	})

	it('keeps the words that only look like a unit', () => {
		expect(mapAddress('1 Market St, Ste. Genevieve, MO')).toBe(
			'1 Market Street, Ste. Genevieve, MO',
		)

		expect(mapAddress('12 Steele St, Denver')).toBe('12 Steele Street, Denver')
	})

	it('keeps "St" as Saint at the start of a street name', () => {
		expect(mapAddress('123 St Charles Ave, New Orleans')).toBe('123 St Charles Avenue, New Orleans')
	})

	it('writes a direction after the street type in full', () => {
		expect(mapAddress('500 Main St E, Twin Falls')).toBe('500 Main Street East, Twin Falls')
	})

	it('keeps a state code at the end of an address with no comma', () => {
		expect(mapAddress('16784 SW Edy Rd Unit 103 Sherwood OR 97140')).toBe(
			'16784 Southwest Edy Road Sherwood OR 97140',
		)

		expect(mapAddress('10 Elm Ct Omaha NE 68102')).toBe('10 Elm Court Omaha NE 68102')
	})
})

describe('addressQueries', () => {
	it('searches the typed address, then the address in the form of the map data', () => {
		expect(addressQueries(' 16784 SW Edy Rd, Sherwood ')).toEqual([
			'16784 SW Edy Rd, Sherwood',
			'16784 Southwest Edy Road, Sherwood',
		])
	})

	it('searches once where the address is already in the form of the map data', () => {
		expect(addressQueries('16784 Southwest Edy Road, Sherwood')).toEqual([
			'16784 Southwest Edy Road, Sherwood',
		])
	})
})
