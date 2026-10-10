import { describe, expect, it } from 'vitest'
import { isWebAddress, isWebsite } from '../../schemas/place'

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

describe('isWebsite', () => {
	it('takes an http(s) address with a top-level domain', () => {
		expect(isWebsite('https://example.com')).toBe(true)

		expect(isWebsite('http://www.example.co.uk/menu')).toBe(true)

		expect(isWebsite('https://xn--e1afmkfd.xn--p1ai')).toBe(true)
	})

	it('refuses a host with no top-level domain, and anything that is not an address', () => {
		expect(isWebsite('https://')).toBe(false)

		expect(isWebsite('https://example')).toBe(false)

		expect(isWebsite('https://example.')).toBe(false)

		expect(isWebsite('http://localhost:3000')).toBe(false)

		expect(isWebsite('http://192.168.0.1')).toBe(false)

		expect(isWebsite('example.com')).toBe(false)

		expect(isWebsite('ftp://example.com')).toBe(false)
	})
})
