// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.resetModules()

	vi.restoreAllMocks()
})

/** A new copy of the module, with no secrets yet. */
function load() {
	return import('../link-secrets')
}

describe('takeLinkSecrets', () => {
	it('moves the token out of the address, and keeps the other parts of the URL', async () => {
		const { getLinkSecret, takeLinkSecrets } = await load()

		window.history.replaceState({ kept: true }, '', '/reset-password?token=abc&next=%2F#form')

		takeLinkSecrets()

		expect(window.location.pathname + window.location.search + window.location.hash).toBe(
			'/reset-password?next=%2F#form',
		)

		expect(window.history.state).toEqual({ kept: true })

		expect(getLinkSecret('token')).toBe('abc')
	})

	it('leaves the address of a link with no secret', async () => {
		const { getLinkSecret, takeLinkSecrets } = await load()

		window.history.replaceState(null, '', '/verify-email?next=%2F')

		const replaceState = vi.spyOn(window.history, 'replaceState')

		takeLinkSecrets()

		expect(replaceState).not.toHaveBeenCalled()

		expect(getLinkSecret('token')).toBe('')
	})
})
