import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { getSignInProviders } from '../sign-in-providers'

const cookies = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies }))

// Stubs the gateway: `fetch` resolves to the given status and body.
function stubGateway(status: number, body: unknown = null) {
	const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body, { status }))

	vi.stubGlobal('fetch', fetch)

	return fetch
}

describe('getSignInProviders', () => {
	beforeEach(() => {
		cookies.mockResolvedValue({ toString: () => '' })
	})

	it('returns the providers that the gateway has set up', async () => {
		const fetch = stubGateway(200, { providers: ['github', 'google'] })

		await expect(getSignInProviders()).resolves.toEqual(['github', 'google'])

		expect(fetch.mock.calls[0]?.[0]).toBe(`${BIFROST_URL}/auth/oauth/providers`)
	})

	it('returns none and logs a failure', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(500)

		await expect(getSignInProviders()).resolves.toEqual([])

		expect(error).toHaveBeenCalledOnce()

		error.mockRestore()
	})

	it('returns none when the gateway does not answer', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('fetch failed')
			}),
		)

		await expect(getSignInProviders()).resolves.toEqual([])

		expect(error).toHaveBeenCalledOnce()

		error.mockRestore()
	})
})
