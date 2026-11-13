import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { describe, expect, it } from 'vitest'
import { config } from '../../proxy'

describe('the matcher of the proxy', () => {
	it('lets a public image load without a session, as the image optimizer requests it', () => {
		expect(unstable_doesMiddlewareMatch({ config, url: '/gradient.png' })).toBe(false)
	})

	it('runs on each page and each API route', () => {
		for (const url of ['/', '/login', '/users/u1', '/api/users']) {
			expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
		}
	})
})
