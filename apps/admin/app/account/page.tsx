import { bifrost, getSignInProviders, requireSession } from 'auth'
import type { Activity } from '@/components/activity-table'
import type { Factors, Identity, Passkey } from './account-api'
import { AccountClient } from './client'

/**
 * Fetches the passkeys of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The passkey list, or `[]` on a non-OK response.
 */
async function getPasskeys(): Promise<Passkey[]> {
	const res = await bifrost('/auth/passkeys')

	if (!res.ok) return []

	const { data } = (await res.json()) as { data: Passkey[] }

	return data
}

const noFactors: Factors = { enabled: false, passkeys: 0, totp: false, recovery_codes: 0 }

/**
 * Fetches the second factors of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The factors, or none on a non-OK response.
 */
async function getFactors(): Promise<Factors> {
	const res = await bifrost('/auth/mfa')

	if (!res.ok) return noFactors

	return (await res.json()) as Factors
}

/**
 * Fetches the GitHub and Google accounts of the signed-in user from the
 * gateway, server-side.
 *
 * @internal
 * @returns The accounts, or `[]` on a non-OK response.
 */
async function getIdentities(): Promise<Identity[]> {
	const res = await bifrost('/auth/oauth/identities')

	if (!res.ok) return []

	const { identities } = (await res.json()) as { identities: Identity[] }

	return identities
}

/**
 * Fetches the recent activity of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The events, newest first, or `[]` on a non-OK response.
 */
async function getActivity(): Promise<Activity[]> {
	const res = await bifrost('/auth/activity')

	if (!res.ok) return []

	const { data } = (await res.json()) as { data: Activity[] }

	return data
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
