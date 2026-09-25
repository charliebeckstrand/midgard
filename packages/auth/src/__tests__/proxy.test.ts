import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { proxy } from '../proxy'

type Gateway = { status: number; authenticated?: boolean } | Error

// Stubs the gateway: `fetch` resolves to the given session, or rejects with the given error.
function stubGateway(gateway: Gateway) {
	const fetch = vi.fn(async (_url: string, _init?: RequestInit) => {
		if (gateway instanceof Error) throw gateway

		return Response.json({ authenticated: gateway.authenticated }, { status: gateway.status })
	})

	vi.stubGlobal('fetch', fetch)

	return fetch
}

// Runs the proxy on a path, and names the outcome: `next`, a redirect, or a status.
async function outcome(pathname: string): Promise<string> {
	const response = await proxy(
		new NextRequest(`https://app.example${pathname}`, { headers: { cookie: 'session=abc' } }),
	)

	const location = response.headers.get('location')

	if (response.headers.get('x-middleware-next')) return 'next'

	return location ? `redirect ${new URL(location).pathname}` : String(response.status)
}

const signedIn = { status: 200, authenticated: true }

const signedOut = { status: 401 }

describe('proxy', () => {
	it.each([
		['/login', signedIn, 'redirect /'],
		['/login', signedOut, 'next'],
		['/register/step-2', { status: 200, authenticated: false }, 'next'],
		['/users', signedIn, 'next'],
		['/users', signedOut, 'redirect /login'],
		['/apis', signedOut, 'redirect /login'],
		['/api/users', signedIn, 'next'],
		['/api/users', signedOut, '401'],
	])('sends %s with the session %o to %s', async (pathname, gateway, expected) => {
		stubGateway(gateway)

		await expect(outcome(pathname)).resolves.toBe(expected)
	})

	it('answers an unauthenticated API request with a 401 JSON body', async () => {
		stubGateway(signedOut)

		const response = await proxy(new NextRequest('https://app.example/api/users'))

		await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
	})

	it('asks the gateway for the session with the cookies of the request, and a timeout', async () => {
		const fetch = stubGateway(signedIn)

		await outcome('/users')

		const [url, init] = fetch.mock.calls[0] ?? []

		expect(url).toBe(`${BIFROST_URL}/auth/session`)

		expect(new Headers(init?.headers).get('cookie')).toBe('session=abc')

		expect(init?.signal).toBeInstanceOf(AbortSignal)
	})

	it('does not log a 401', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(signedOut)

		await outcome('/users')

		expect(error).not.toHaveBeenCalled()
	})

	it.each([
		['a failed status', { status: 500 }],
		['a thrown request', new Error('connection refused')],
		['a timeout', new DOMException('The operation timed out', 'TimeoutError')],
	])('treats %s as no session, and logs it', async (_, gateway) => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(gateway)

		await expect(outcome('/users')).resolves.toBe('redirect /login')

		expect(error).toHaveBeenCalledOnce()
	})
})
