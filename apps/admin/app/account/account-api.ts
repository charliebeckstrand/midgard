import { startRegistration } from '@simplewebauthn/browser'

/**
 * The requests that the account page sends from the client. Each goes to a
 * same-origin `/auth/*` path, which the gateway serves (CONVENTIONS §6.3).
 */

/** A passkey of the signed-in user, as the gateway lists it. */
export type Passkey = {
	id: string
	created_at: string
}

/**
 * Sends one same-origin request and checks its status.
 *
 * A query or a mutation reads a thrown error as a failure. On a non-OK
 * response, the error holds the message of the gateway, such as "Sign in again
 * to change your passkeys", so that the page can show it.
 */
async function request(path: string, init?: RequestInit): Promise<Response> {
	const response = await fetch(path, init)

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { message?: string } | null

		throw new Error(body?.message ?? `${init?.method ?? 'GET'} ${path} failed: ${response.status}`)
	}

	return response
}

/** The passkeys of the signed-in user. */
export async function fetchPasskeys(signal?: AbortSignal): Promise<Passkey[]> {
	const response = await request('/auth/passkeys', { signal })

	const { data } = (await response.json()) as { data: Passkey[] }

	return data
}

/**
 * Adds a passkey to the signed-in user, and returns the new passkey.
 *
 * The gateway gives the options of the ceremony, the browser makes the passkey,
 * and the gateway checks the result. The gateway accepts a change only within
 * ten minutes of the sign-in.
 */
export async function addPasskey(): Promise<Passkey> {
	const options = await request('/auth/passkeys/options', { method: 'POST' })

	const credential = await startRegistration({ optionsJSON: await options.json() })

	const response = await request('/auth/passkeys', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(credential),
	})

	return (await response.json()) as Passkey
}

/**
 * Removes one passkey of the signed-in user.
 *
 * The gateway refuses to remove the last passkey of an admin with a `409`.
 */
export async function removePasskey(id: string): Promise<void> {
	await request(`/auth/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
