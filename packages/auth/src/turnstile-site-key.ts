import { cacheLife } from 'next/cache'
import { publicBifrost, readGateway } from './fetch'

/**
 * Returns the key that the register page shows Cloudflare Turnstile with, or
 * `null` when the gateway has no Turnstile or does not answer.
 *
 * @remarks
 * The gateway turns Turnstile on when it has the keys, and then it refuses a
 * sign-up without a token. The key is the same for each user, so the read sends
 * no cookies and the answer goes into the cache for some hours. Thus the
 * register page can prerender, and a navigation to it does not wait for the
 * gateway. A change of the keys can show late. A failure goes to the log and
 * stays in the cache for one minute at most.
 */
export async function getTurnstileSiteKey(): Promise<string | null> {
	'use cache'

	const data = await readGateway('/auth/register/options', () =>
		publicBifrost.GET('/auth/register/options'),
	)

	// A prerender leaves out an answer with a short life, so it does not keep a failure.
	cacheLife(data ? 'hours' : 'seconds')

	return data?.turnstile_site_key ?? null
}
