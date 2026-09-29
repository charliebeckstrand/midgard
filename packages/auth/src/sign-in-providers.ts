import { cacheLife } from 'next/cache'
import { publicBifrost, readGateway, type Schema } from './fetch'

/** A provider that a user can sign in with, as the gateway names it. */
export type SignInProvider = Schema<'Identity'>['provider']

/**
 * Returns the providers that the gateway has set up, or `[]` when it has none
 * or does not answer.
 *
 * @remarks
 * The gateway turns a provider on when it has the OAuth client of that
 * provider, so a page shows only the buttons that work. The providers are the
 * same for each user, so the read sends no cookies and the answer goes into the
 * cache for some hours. Thus the sign-in page can prerender, and a navigation
 * to it does not wait for the gateway. A new provider can show late. A failure
 * goes to the log and stays in the cache for one minute at most.
 */
export async function getSignInProviders(): Promise<SignInProvider[]> {
	'use cache'

	const data = await readGateway('/auth/oauth/providers', () =>
		publicBifrost.GET('/auth/oauth/providers'),
	)

	// A prerender leaves out an answer with a short life, so it does not keep a failure.
	cacheLife(data ? 'hours' : 'seconds')

	return data?.providers ?? []
}
