import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequest, postJson, readError } from '../http'

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('readError', () => {
	it.each([
		['the message of the gateway', { message: 'Sign in again' }, 'Sign in again'],
		[
			'the issues of a route',
			{ issues: ['Name is empty.', 'Date is late.'] },
			'Name is empty. Date is late.',
		],
		['the error of the proxy', { error: 'Bad gateway' }, 'Bad gateway'],
		['the fallback for a body with no reason', { message: '', issues: [] }, 'Failed'],
	])('reads %s', async (_, body, expected) => {
		await expect(readError(Response.json(body, { status: 400 }), 'Failed')).resolves.toBe(expected)
	})

	it('reads the fallback for a body that is not JSON', async () => {
		await expect(readError(new Response('<html>', { status: 502 }), 'Failed')).resolves.toBe(
			'Failed',
		)
	})
})

describe('postJson', () => {
	it('sends the body as JSON with POST', async () => {
		const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null))

		vi.stubGlobal('fetch', fetch)

		await postJson('/auth/login', { email: 'ada@example.com' })

		const [url, init] = fetch.mock.calls[0] ?? []

		expect(url).toBe('/auth/login')

		expect(init?.method).toBe('POST')

		expect(new Headers(init?.headers).get('content-type')).toBe('application/json')

		expect(init?.body).toBe('{"email":"ada@example.com"}')
	})
})

describe('createRequest', () => {
	it('parses the body of an OK response', async () => {
		const { json } = createRequest({ fetch: async () => Response.json({ data: [1] }) })

		await expect(json('/api/users')).resolves.toEqual({ data: [1] })
	})

	it('throws the reason of a refused request', async () => {
		const { request } = createRequest({
			fetch: async () => Response.json({ message: 'Admins cannot change.' }, { status: 403 }),
		})

		await expect(request('/api/users/1', { method: 'PATCH' })).rejects.toThrow(
			'Admins cannot change.',
		)
	})

	it('throws the method, path, and status when the body gives no reason', async () => {
		const { request } = createRequest({ fetch: async () => new Response(null, { status: 500 }) })

		await expect(request('/api/users')).rejects.toThrow('GET /api/users failed: 500')
	})

	it('runs onUnauthorized on a 401 only', async () => {
		const onUnauthorized = vi.fn()

		const status = { current: 401 }

		const { request } = createRequest({
			fetch: async () => new Response(null, { status: status.current }),
			onUnauthorized,
		})

		await expect(request('/api/places')).rejects.toThrow()

		status.current = 403

		await expect(request('/api/places')).rejects.toThrow()

		expect(onUnauthorized).toHaveBeenCalledOnce()
	})

	it('sends a JSON body with the method', async () => {
		const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ id: 'p1' }))

		const { send } = createRequest({ fetch })

		await expect(send('/api/places/p1', 'PUT', { name: 'Oslo' })).resolves.toEqual({ id: 'p1' })

		const [, init] = fetch.mock.calls[0] ?? []

		expect(init?.method).toBe('PUT')

		expect(init?.body).toBe('{"name":"Oslo"}')
	})
})
