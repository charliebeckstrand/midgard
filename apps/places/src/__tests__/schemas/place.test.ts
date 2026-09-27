import { describe, expect, it } from 'vitest'
import { isWebAddress } from '../../schemas/place'

describe('isWebAddress', () => {
	it('takes http and https', () => {
		expect(isWebAddress('https://example.com')).toBe(true)

		expect(isWebAddress('http://example.com/a?b=c')).toBe(true)
	})

	it('refuses every other scheme, and anything that is not an address', () => {
		expect(isWebAddress('javascript:alert(1)')).toBe(false)

		expect(isWebAddress('data:text/html,<script>')).toBe(false)

		expect(isWebAddress('ftp://example.com')).toBe(false)

		expect(isWebAddress('example.com')).toBe(false)
	})
})
