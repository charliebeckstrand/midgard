import { describe, expect, it, vi } from 'vitest'
import { takeLinkToken } from '../auth/link-token'

/** A window at `href`, whose `replaceState` moves its location. */
function stubWindow(href: string) {
	const location = { href }

	const replaceState = vi.fn((_state: unknown, _unused: string, url: URL) => {
		location.href = url.href
	})

	vi.stubGlobal('window', { location, history: { state: { __NA: true }, replaceState } })

	return { location, replaceState }
}

describe('takeLinkToken', () => {
	it('returns the token and removes it from the address bar, with the other parts of the URL', () => {
		const { location, replaceState } = stubWindow(
			'https://app.test/reset-password?token=abc&next=%2F#form',
		)

		expect(takeLinkToken()).toBe('abc')

		expect(location.href).toBe('https://app.test/reset-password?next=%2F#form')

		// The App Router copies its own state into a `null` state and moves
		// its URL. It skips the sync of a state that holds its mark.
		expect(replaceState.mock.calls[0]?.[0]).toBeNull()
	})

	it('returns an empty token and leaves the address bar for a link with no token', () => {
		const { replaceState } = stubWindow('https://app.test/verify-email')

		expect(takeLinkToken()).toBe('')

		expect(replaceState).not.toHaveBeenCalled()
	})
})
