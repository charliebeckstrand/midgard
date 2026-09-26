import { unstable_rethrow } from 'next/navigation'
import { cache } from 'react'
import { bifrost } from './fetch'

/** A provider that a user can sign in with, as the gateway names it. */
export type SignInProvider = 'github' | 'google'

/**
 * Returns the providers that the gateway has set up, or `[]` when it has none
 * or does not answer.
 *
 * @remarks
 * The gateway turns a provider on when it has the OAuth client of that
 * provider, so a page shows only the buttons that work. Each failure goes to
 * the log. React `cache` wraps it, so repeat calls in one request hit the
 * gateway once.
 */
export const getSignInProviders = cache(async (): Promise<SignInProvider[]> => {
	try {
		const res = await bifrost('/auth/oauth/providers')

		if (res.ok) {
			const { providers } = (await res.json()) as { providers: SignInProvider[] }

			return providers
		}

		console.error(`auth: GET /auth/oauth/providers failed (${res.status})`)
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error('auth: GET /auth/oauth/providers threw', error)
	}

	return []
})
