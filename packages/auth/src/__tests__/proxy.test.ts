import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { proxy } from '../proxy'

const session = '__Host-session=abc'

// Runs the proxy on a path, and names the outcome: `next`, a redirect, or a status.
function outcome(pathname: string, cookie?: string): string {
	const response = proxy(
		new NextRequest(`https://app.example${pathname}`, {
			headers: cookie ? { cookie } : {},
		}),
	)

	const location = response.headers.get('location')

	if (response.headers.get('x-middleware-next')) return 'next'

	return location ? `redirect ${new URL(location).pathname}` : String(response.status)
}

describe('proxy', () => {
	it.each([
		['/login', session, 'next'],
		['/login', undefined, 'next'],
		['/register/step-2', undefined, 'next'],
		['/users', session, 'next'],
		['/users', undefined, 'redirect /login'],
		['/users', 'session=abc', 'redirect /login'],
		['/apis', undefined, 'redirect /login'],
		['/api/users', session, 'next'],
		['/api/users', undefined, '401'],
		['/auth/login', undefined, 'next'],
	])('sends %s with the cookie %o to %s', (pathname, cookie, expected) => {
		expect(outcome(pathname, cookie)).toBe(expected)
	})

	it('answers an API request without the cookie with a 401 JSON body', async () => {
		const response = proxy(new NextRequest('https://app.example/api/users'))

		await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
	})

	it('sends no request to the gateway', () => {
		const fetch = vi.fn()

		vi.stubGlobal('fetch', fetch)

		outcome('/users', session)

		outcome('/api/users', session)

		expect(fetch).not.toHaveBeenCalled()
	})
})

describe('proxy address forwarding', () => {
	const secret = 'a-client-ip-secret-of-at-least-32-chars'

	// The proxy reads `CLIENT_IP_SECRET` once, at load, so each case loads a new instance.
	async function forwarded(
		pathname: string,
		env: { CLIENT_IP_SECRET?: string } = {},
		entry: 'proxy' | 'forwardClientIp' = 'proxy',
	) {
		vi.stubEnv('CLIENT_IP_SECRET', env.CLIENT_IP_SECRET)

		vi.resetModules()

		const handler = (await import('../proxy'))[entry]

		const response = handler(
			new NextRequest(`https://app.example${pathname}`, {
				headers: {
					cookie: session,
					'do-connecting-ip': '203.0.113.9',
					'x-client-ip': '198.51.100.66',
					'x-client-ip-secret': 'forged',
				},
			}),
		)

		return {
			ip: response.headers.get('x-middleware-request-x-client-ip'),
			secret: response.headers.get('x-middleware-request-x-client-ip-secret'),
		}
	}

	it.each(['/auth/login', '/api/users'])(
		'sends the browser address and the secret with %s',
		async (pathname) => {
			await expect(forwarded(pathname, { CLIENT_IP_SECRET: secret })).resolves.toEqual({
				ip: '203.0.113.9',
				secret,
			})
		},
	)

	it('sends the browser address from the proxy of an app with no gate', async () => {
		await expect(
			forwarded('/auth/login', { CLIENT_IP_SECRET: secret }, 'forwardClientIp'),
		).resolves.toEqual({ ip: '203.0.113.9', secret })
	})

	it('removes the forged values when no secret is set', async () => {
		await expect(forwarded('/auth/login')).resolves.toEqual({ ip: null, secret: null })
	})

	it('does not send the secret with a page request', async () => {
		await expect(forwarded('/users', { CLIENT_IP_SECRET: secret })).resolves.toEqual({
			ip: null,
			secret: null,
		})
	})

	it('fails to load in production when the secret is not set', async () => {
		vi.stubEnv('NODE_ENV', 'production')

		vi.stubEnv('BIFROST_URL', 'https://bifrost.example')

		vi.stubEnv('CLIENT_IP_SECRET', undefined)

		vi.resetModules()

		await expect(import('../proxy')).rejects.toThrow(/CLIENT_IP_SECRET is not set/)
	})
})
