import { describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { getSignInProviders } from '../sign-in-providers'
import { stubGateway } from './helpers/stub-gateway'

const cacheLife = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({ cacheLife }))

describe('getSignInProviders', () => {
	it('returns the providers that the gateway has set up', async () => {
		const fetch = stubGateway(200, { providers: ['github', 'google'] })

		await expect(getSignInProviders()).resolves.toEqual(['github', 'google'])

		expect(fetch.mock.calls[0]?.[0].headers.has('cookie')).toBe(false)

		expect(cacheLife).toHaveBeenCalledWith('hours')

		expect(fetch.mock.calls[0]?.[0].url).toBe(`${BIFROST_URL}/auth/oauth/providers`)
	})

	it('returns none and logs a failure', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(500)

		await expect(getSignInProviders()).resolves.toEqual([])

		expect(error).toHaveBeenCalledOnce()

		expect(cacheLife).toHaveBeenCalledWith('seconds')
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

		expect(cacheLife).toHaveBeenCalledWith('seconds')
	})
})
