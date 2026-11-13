import { describe, expect, it, vi } from 'vitest'
import { takeLinkToken } from '../auth/link-token'

/** A window at `href`, whose `replaceState` moves its location. */
function stubWindow(href: string) {
	const location = { href }

	const replaceState = vi.fn((_state: unknown, _unused: string, url: URL) => {
		location.href = url.href
	})

	vi.stubGlobal('window', { location, history: { state: { key: 'k' }, replaceState } })

	return { location, replaceState }
}

describe('takeLinkToken', () => {
	it('returns the token and removes it from the address bar, with the other parts of the URL', () => {
		const { location, replaceState } = stubWindow(
			'https://app.test/reset-password?token=abc&next=%2F#form',
		)

		expect(takeLinkToken()).toBe('abc')

		expect(location.href).toBe('https://app.test/reset-password?next=%2F#form')

		// The history entry keeps its state, so the router keeps its own.
		expect(replaceState.mock.calls[0]?.[0]).toEqual({ key: 'k' })
	})

	it('returns an empty token and leaves the address bar for a link with no token', () => {
		const { replaceState } = stubWindow('https://app.test/verify-email')

		expect(takeLinkToken()).toBe('')

		expect(replaceState).not.toHaveBeenCalled()
	})
})
