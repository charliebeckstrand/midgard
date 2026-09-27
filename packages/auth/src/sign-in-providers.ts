import { cache } from 'react'
import { bifrost, readGateway, type Schema } from './fetch'

/** A provider that a user can sign in with, as the gateway names it. */
export type SignInProvider = Schema<'Identity'>['provider']

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
	const data = await readGateway('/auth/oauth/providers', () =>
		bifrost.GET('/auth/oauth/providers'),
	)

	return data?.providers ?? []
})
