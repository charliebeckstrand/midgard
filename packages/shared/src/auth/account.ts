import type { SignInProvider } from 'auth'
import { bifrost, unwrap } from './bifrost'

/** The display name of each {@link SignInProvider}. */
export const signInProviderNames: Record<SignInProvider, string> = {
	github: 'GitHub',
	google: 'Google',
}

/** Options for {@link oauthStartPath}. */
export type OAuthStartOptions = {
	/** Connect the account to the signed-in user, rather than sign in with it. */
	link?: boolean
	/** The same-origin path that the gateway goes back to after the provider. */
	returnTo?: string
}

/**
 * The path that starts a GitHub or Google sign-in, or connects the account.
 *
 * @remarks
 * Load it as a full page: the gateway answers with a redirect to the provider.
 *
 * @param provider - The provider to start.
 * @param options - Whether to connect the account, and where to go back to.
 * @returns The same-origin start path.
 */
export function oauthStartPath(provider: SignInProvider, options: OAuthStartOptions = {}): string {
	const query = new URLSearchParams()

	if (options.link) query.set('link', '1')

	if (options.returnTo) query.set('return_to', options.returnTo)

	const search = query.toString()

	return `/auth/oauth/${provider}/start${search ? `?${search}` : ''}`
}

/**
 * Ends the session and loads `/login`.
 *
 * @remarks
 * A full page load, so that no data of the user stays in a query cache for the
 * next user of the tab. The load replaces the current page in the history.
 * The sign-out goes on when the request fails, because the page leaves anyway.
 */
export async function signOut(): Promise<void> {
	await bifrost.POST('/auth/logout').catch(() => {})

	window.location.replace('/login')
}

/**
 * Emails the signed-in user a new link that verifies the email.
 *
 * @remarks
 * The gateway sends one link each minute at most, and refuses another with a
 * `429`. The error then holds the gateway's message.
 */
export async function sendVerificationEmail(): Promise<void> {
	await unwrap(bifrost.POST('/auth/verify-email'))
}
