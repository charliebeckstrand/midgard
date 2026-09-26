import { bifrost, requireSession } from 'auth'
import type { Factors, Passkey } from './account-api'
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
 * Account page of each signed-in user. The proxy only finds the cookie, so
 * `requireSession` checks the session, and sends a guest to `/login`.
 */
export default async function AccountPage() {
	const { user } = await requireSession()

	const [passkeys, factors] = await Promise.all([getPasskeys(), getFactors()])

	return <AccountClient user={user} passkeys={passkeys} factors={factors} />
}
