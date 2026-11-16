import { describe, expect, it } from 'vitest'
import { parseOffset } from '../utilities/reader-offset'

describe('parseOffset', () => {
	it('gives the offset of the cookie in minutes', () => {
		expect(parseOffset('360')).toBe(360)
		expect(parseOffset('-330')).toBe(-330)
		expect(parseOffset('0')).toBe(0)
		expect(parseOffset('-840')).toBe(-840)
	})

	it('gives no offset for no cookie or a value that is not an offset', () => {
		expect(parseOffset(undefined)).toBeNull()
		expect(parseOffset('')).toBeNull()
		expect(parseOffset('6h')).toBeNull()
		expect(parseOffset('1.5')).toBeNull()
		expect(parseOffset('900')).toBeNull()
	})
})
