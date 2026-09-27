import { unstable_rethrow } from 'next/navigation'
import { cache } from 'react'
import { bifrost } from './fetch'

/**
 * Returns the key that the register page shows Cloudflare Turnstile with, or
 * `null` when the gateway has no Turnstile or does not answer.
 *
 * @remarks
 * The gateway turns Turnstile on when it has the keys, and then it refuses a
 * sign-up without a token. Each failure goes to the log. React `cache` wraps
 * it, so repeat calls in one request hit the gateway once.
 */
export const getTurnstileSiteKey = cache(async (): Promise<string | null> => {
	try {
		const { data, response } = await bifrost.GET('/auth/register/options')

		if (data) return data.turnstile_site_key

		console.error(`auth: GET /auth/register/options failed (${response.status})`)
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error('auth: GET /auth/register/options threw', error)
	}

	return null
})
