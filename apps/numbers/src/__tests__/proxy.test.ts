import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { config, proxy } from '../../proxy'

describe('the matcher of the proxy', () => {
	it('runs on `/`, on `/vs`, and on the auth and API routes of the gateway', () => {
		for (const url of ['/', '/vs', '/auth/session', '/api/games/numbers/stats']) {
			expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
		}
	})

	it('does not run on a run or on a sign-in page', () => {
		for (const url of ['/abc123', '/vs/abc123', '/login', '/verify-email', '/icon.png']) {
			expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
		}
	})
})

describe('proxy', () => {
	it('sends `/` to the address of a new seed', () => {
		const response = proxy(new NextRequest('http://localhost/'))

		expect(response.status).toBe(307)
		expect(response.headers.get('location')).toMatch(/^http:\/\/localhost\/[a-z0-9]{6}$/)
	})

	it('sends `/vs` to the address of a new seed against the CPU', () => {
		const response = proxy(new NextRequest('http://localhost/vs'))

		expect(response.status).toBe(307)

		expect(response.headers.get('location')).toMatch(/^http:\/\/localhost\/vs\/[a-z0-9]{6}$/)
	})

	it('sends an auth request on to the gateway, with no redirect', () => {
		const response = proxy(new NextRequest('http://localhost/auth/session'))

		expect(response.headers.get('location')).toBeNull()
		expect(response.headers.get('x-middleware-next')).toBe('1')
	})
})
