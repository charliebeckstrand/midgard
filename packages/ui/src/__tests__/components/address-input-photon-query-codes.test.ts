// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { splitPostcode } from '../../components/address-input/address-input-photon-query'

describe('splitPostcode', () => {
	it('reads an unspaced UK code as a candidate', () => {
		expect(splitPostcode('10 Downing St SW1A2AA')).toEqual([
			{ rest: '10 Downing St', qualifier: 'SW1A2AA' },
		])
	})

	it('reads an unspaced UK code in lowercase as a candidate', () => {
		expect(splitPostcode('sw1a2aa')).toEqual([{ rest: '', qualifier: 'SW1A2AA' }])
	})

	it('reads an unspaced Canadian code as a candidate', () => {
		expect(splitPostcode('Toronto M5V3L9')).toEqual([{ rest: 'Toronto', qualifier: 'M5V3L9' }])
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
