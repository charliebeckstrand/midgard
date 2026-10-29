// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readCookie } from '../../utilities/cookie'

// A server reads the `Cookie` header of a request, and the browser reads
// `document.cookie`. The two take one parse.

describe('readCookie', () => {
	it('reads the value of the cookie from a Cookie header', () => {
		expect(readCookie('locale', 'theme=dark; locale=es')).toBe('es')

		expect(readCookie('locale', 'theme=dark;locale=es')).toBe('es')

		expect(readCookie('locale', 'theme=dark')).toBeUndefined()
	})

	it('decodes the value', () => {
		expect(readCookie('name', 'name=a%20b')).toBe('a b')
	})

	// A cookie that another app of the site wrote can hold a bad escape.
	it('gives no value for a value that does not decode', () => {
		expect(readCookie('locale', 'locale=%E0%A4%A')).toBeUndefined()
	})
})
