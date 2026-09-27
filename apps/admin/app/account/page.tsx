import { bifrost, getSignInProviders, requireGateway, requireSession } from 'auth'
import type { Activity } from '@/components/activity-table'
import type { Factors, Identity, Passkey } from './account-api'
import { AccountClient } from './client'

/**
 * Fetches the passkeys of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The passkey list. A failed read throws.
 */
async function getPasskeys(): Promise<Passkey[]> {
	const data = await requireGateway('/auth/passkeys', () => bifrost.GET('/auth/passkeys'))

	return data?.data ?? []
}

const noFactors: Factors = { enabled: false, passkeys: 0, totp: false, recovery_codes: 0 }

/**
 * Fetches the second factors of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The factors. A failed read throws, so an outage does not show "no second factor".
 */
async function getFactors(): Promise<Factors> {
	const data = await requireGateway('/auth/mfa', () => bifrost.GET('/auth/mfa'))

	return data ?? noFactors
}

/**
 * Fetches the GitHub and Google accounts of the signed-in user from the
 * gateway, server-side.
 *
 * @internal
 * @returns The accounts. A failed read throws.
 */
async function getIdentities(): Promise<Identity[]> {
	const data = await requireGateway('/auth/oauth/identities', () =>
		bifrost.GET('/auth/oauth/identities'),
	)

	return data?.identities ?? []
}

/**
 * Fetches the recent activity of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The events, newest first. A failed read throws.
 */
async function getActivity(): Promise<Activity[]> {
	const data = await requireGateway('/auth/activity', () => bifrost.GET('/auth/activity'))

	return data?.data ?? []
}

/**
 * Account page of each signed-in user. The proxy only finds the cookie, so
 * `requireSession` checks the session, and sends a guest to `/login`.
 */
export default async function AccountPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string | string[] }>
}) {
	const { user } = await requireSession()

	const [passkeys, factors, identities, activity, providers, { error }] = await Promise.all([
		getPasskeys(),
		getFactors(),
		getIdentities(),
		getActivity(),
		getSignInProviders(),
		searchParams,
	])

	return (
		<AccountClient
			user={user}
			passkeys={passkeys}
			factors={factors}
			identities={identities}
			activity={activity}
			providers={providers}
			connectError={typeof error === 'string' ? error : undefined}
		/>
	)
}
