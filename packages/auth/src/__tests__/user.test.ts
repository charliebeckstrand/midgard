import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { getUser } from '../user'

const cookies = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies }))

const user = {
	id: 'u1',
	email: 'ada@example.com',
	is_active: true,
	is_verified: true,
	role: 'user',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
}

// Stubs the gateway: `fetch` resolves to the given status and body.
function stubGateway(status: number, body: unknown = null) {
	const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body, { status }))

	vi.stubGlobal('fetch', fetch)

	return fetch
}

describe('getUser', () => {
	beforeEach(() => {
		cookies.mockResolvedValue({ toString: () => 'session=abc' })
	})

	it('returns the user of the session', async () => {
		const fetch = stubGateway(200, {
			id: 'hash',
			created_at: '2026-01-01T00:00:00Z',
			expires_at: '2026-01-31T00:00:00Z',
			user,
		})

		await expect(getUser()).resolves.toEqual(user)

		const [url, init] = fetch.mock.calls[0] ?? []

		expect(url).toBe(`${BIFROST_URL}/auth/session`)

		expect(new Headers(init?.headers).get('cookie')).toBe('session=abc')
	})

	it('returns undefined for a 401, and does not log it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(401)

		await expect(getUser()).resolves.toBeUndefined()

		expect(error).not.toHaveBeenCalled()
	})

	it('returns undefined for a failed status, and logs it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(500)

		await expect(getUser()).resolves.toBeUndefined()

		expect(error).toHaveBeenCalledOnce()
	})

	it('returns undefined for a thrown request, and logs it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')))

		await expect(getUser()).resolves.toBeUndefined()

		expect(error).toHaveBeenCalledOnce()
	})

	it('lets the dynamic-usage signal of a prerender through', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		// The shape that `unstable_rethrow` knows: Next marks the error with this digest.
		const signal = Object.assign(new Error('Dynamic server usage'), {
			digest: 'DYNAMIC_SERVER_USAGE',
		})

		cookies.mockRejectedValue(signal)

		await expect(getUser()).rejects.toBe(signal)

		expect(error).not.toHaveBeenCalled()
	})
})
