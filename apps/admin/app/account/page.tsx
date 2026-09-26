import { bifrost, requireSession } from 'auth'
import type { Passkey } from './account-api'
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

/**
 * Account page of each signed-in user. The proxy only finds the cookie, so
 * `requireSession` checks the session, and sends a guest to `/login`.
 */
export default async function AccountPage() {
	const { user } = await requireSession()

	const passkeys = await getPasskeys()

	return <AccountClient user={user} passkeys={passkeys} />
}
