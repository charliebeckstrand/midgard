import { cache } from 'react'
import { readGateway } from './fetch'

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
	const body = await readGateway<{ turnstile_site_key: string | null }>('/auth/register/options')

	return body?.turnstile_site_key ?? null
})
