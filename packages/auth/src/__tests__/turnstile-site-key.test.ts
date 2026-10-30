import { describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { getTurnstileSiteKey } from '../turnstile-site-key'
import { stubGateway } from './helpers/stub-gateway'

const cacheLife = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({ cacheLife }))

describe('getTurnstileSiteKey', () => {
	it('returns the key that the gateway gives', async () => {
		const fetch = stubGateway(200, { turnstile_site_key: 'site-key' })

		await expect(getTurnstileSiteKey()).resolves.toBe('site-key')

		expect(fetch.mock.calls[0]?.[0].headers.has('cookie')).toBe(false)

		expect(cacheLife).toHaveBeenCalledWith('hours')

		expect(fetch.mock.calls[0]?.[0].url).toBe(`${BIFROST_URL}/auth/register/options`)
	})

	it('returns null when the gateway has no Turnstile', async () => {
		stubGateway(200, { turnstile_site_key: null })

		await expect(getTurnstileSiteKey()).resolves.toBeNull()
	})

	it('returns null and logs a failure', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(500)

		await expect(getTurnstileSiteKey()).resolves.toBeNull()

		expect(error).toHaveBeenCalledOnce()

		expect(cacheLife).toHaveBeenCalledWith('seconds')
	})
})
