// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { splitPostcode } from '../../components/address-input/address-input-photon-query'

describe('splitPostcode', () => {
	it.for([
		['an unspaced UK code', '10 Downing St SW1A2AA', '10 Downing St', 'SW1A2AA'],
		['an unspaced UK code in lowercase', 'sw1a2aa', '', 'SW1A2AA'],
		['an unspaced Canadian code', 'Toronto M5V3L9', 'Toronto', 'M5V3L9'],
	] as const)('reads %s as a candidate', ([, query, rest, qualifier]) => {
		expect(splitPostcode(query)).toEqual([{ rest, qualifier }])
	})

	it('reads a spaced ZIP+4 as its first five digits', () => {
		expect(splitPostcode('ice cream 97140 1234')[0]).toEqual({
			rest: 'ice cream',
			qualifier: '97140',
		})
	})

	it('still reads a spaced UK code as two words', () => {
		expect(splitPostcode('pub SW1A 1AA')[0]).toEqual({ rest: 'pub', qualifier: 'SW1A 1AA' })
	})

	it.each(['5th Ave', 'Pier 39', 'Route 66', 'Suite 1234567', 'Flat B12345C', 'Main St A1B2C3D4'])(
		'keeps "%s" as text',
		(query) => {
			expect(splitPostcode(query)).toEqual([])
		},
	)
})
