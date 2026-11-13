import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { describe, expect, it } from 'vitest'
import { config } from '../../proxy'

describe('the matcher of the proxy', () => {
	it('lets the app icon load without a session, so a signed-out page shows it', () => {
		expect(unstable_doesMiddlewareMatch({ config, url: '/icon.png' })).toBe(false)
	})

	it('runs on each page and each API route', () => {
		for (const url of ['/', '/login', '/api/places']) {
			expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
		}
	})
})
