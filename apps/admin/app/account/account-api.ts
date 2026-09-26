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
 * to change how you sign in", so that the page can show it.
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
 * The gateway refuses to remove the last second factor of an admin with a `409`.
 */
export async function removePasskey(id: string): Promise<void> {
	await request(`/auth/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** The second factors of the signed-in user, as the gateway reports them. */
export type Factors = {
	/** Whether a sign-in takes a second step: a passkey or an authenticator app is on. */
	enabled: boolean
	passkeys: number
	totp: boolean
	recovery_codes: number
}

/** A new authenticator-app secret, before the user confirms it. */
export type TotpSetup = {
	/** The secret in base32, for an app that cannot scan. */
	secret: string
	/** The `otpauth://` URI, for the QR code. */
	uri: string
}

/** The second factors of the signed-in user. */
export async function fetchFactors(signal?: AbortSignal): Promise<Factors> {
	const response = await request('/auth/mfa', { signal })

	return (await response.json()) as Factors
}

/**
 * Starts adding an authenticator app. The app stays off until
 * {@link confirmTotp} sends a code from it.
 */
export async function startTotpSetup(): Promise<TotpSetup> {
	const response = await request('/auth/mfa/totp/setup', { method: 'POST' })

	return (await response.json()) as TotpSetup
}

/** Turns on the authenticator app with a code that it shows now. */
export async function confirmTotp(code: string): Promise<void> {
	await request('/auth/mfa/totp', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code }),
	})
}

/**
 * Removes the authenticator app.
 *
 * The gateway refuses to remove the last second factor of an admin with a `409`.
 */
export async function removeTotp(): Promise<void> {
	await request('/auth/mfa/totp', { method: 'DELETE' })
}

/** Replaces the recovery codes, and returns the new ones. The gateway shows them only this once. */
export async function generateRecoveryCodes(): Promise<string[]> {
	const response = await request('/auth/mfa/recovery-codes', { method: 'POST' })

	const { codes } = (await response.json()) as { codes: string[] }

	return codes
}

/** A provider that a user can sign in with. It matches the `SignInProvider` of `auth`. */
export type Provider = 'github' | 'google'

/** A GitHub or Google account connected to the signed-in user. */
export type Identity = {
	provider: Provider
	/** The verified email of the account, or null when it has none. */
	email: string | null
	created_at: string
}

/** The GitHub and Google accounts connected to the signed-in user. */
export async function fetchIdentities(signal?: AbortSignal): Promise<Identity[]> {
	const response = await request('/auth/oauth/identities', { signal })

	const { identities } = (await response.json()) as { identities: Identity[] }

	return identities
}

/**
 * Disconnects the account of the provider.
 *
 * The gateway refuses with a `409` when the user then has no way to sign in: no
 * password, no other connected account, and no passkey.
 */
export async function unlinkIdentity(provider: Provider): Promise<void> {
	await request(`/auth/oauth/identities/${provider}`, { method: 'DELETE' })
}
