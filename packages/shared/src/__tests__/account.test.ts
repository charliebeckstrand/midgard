import { afterEach, describe, expect, it, vi } from 'vitest'
import { oauthStartPath, signOut } from '../auth/account'

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('oauthStartPath', () => {
	it('starts a sign-in', () => {
		expect(oauthStartPath('github')).toBe('/auth/oauth/github/start')
	})

	it('starts a connect that goes back to a path', () => {
		const url = new URL(oauthStartPath('google', { link: true, returnTo: '/account' }), 'https://x')

		expect(url.pathname).toBe('/auth/oauth/google/start')

		expect(url.searchParams.get('link')).toBe('1')

		expect(url.searchParams.get('return_to')).toBe('/account')
	})
})

describe('signOut', () => {
	it('ends the session, then loads /login, also when the request fails', async () => {
		const fetch = vi.fn().mockRejectedValue(new Error('offline'))

		const replace = vi.fn()

		vi.stubGlobal('fetch', fetch)

		vi.stubGlobal('window', { location: { replace } })

		await signOut()

		expect(fetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' })

		expect(replace).toHaveBeenCalledWith('/login')
	})
})
