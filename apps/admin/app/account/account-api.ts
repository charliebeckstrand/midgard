import { startRegistration } from '@simplewebauthn/browser'
import { fetchWithSecondStep, type SignInProvider } from 'shared/auth'
import { createRequest } from 'shared/http'

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
 * The checked requests. When the gateway asks for the second step, the dialog
 * of the app asks the user for it, and the request goes again. The error of a
 * refused request holds the gateway's message, such as "Sign in again to
 * change how you sign in", so that the page can show it.
 */
const { request, json, send } = createRequest({ fetch: fetchWithSecondStep })

/** The passkeys of the signed-in user. */
export async function fetchPasskeys(signal?: AbortSignal): Promise<Passkey[]> {
	const { data } = await json<{ data: Passkey[] }>('/auth/passkeys', { signal })

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

	return send<Passkey>('/auth/passkeys', 'POST', credential)
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
export function fetchFactors(signal?: AbortSignal): Promise<Factors> {
	return json<Factors>('/auth/mfa', { signal })
}

/**
 * Starts adding an authenticator app. The app stays off until
 * {@link confirmTotp} sends a code from it.
 */
export function startTotpSetup(): Promise<TotpSetup> {
	return json<TotpSetup>('/auth/mfa/totp/setup', { method: 'POST' })
}

/** Turns on the authenticator app with a code that it shows now. */
export async function confirmTotp(code: string): Promise<void> {
	await send('/auth/mfa/totp', 'POST', { code })
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
	const { codes } = await json<{ codes: string[] }>('/auth/mfa/recovery-codes', {
		method: 'POST',
	})

	return codes
}

/** A GitHub or Google account connected to the signed-in user. */
export type Identity = {
	provider: SignInProvider
	/** The verified email of the account, or null when it has none. */
	email: string | null
	created_at: string
}

/** The GitHub and Google accounts connected to the signed-in user. */
export async function fetchIdentities(signal?: AbortSignal): Promise<Identity[]> {
	const { identities } = await json<{ identities: Identity[] }>('/auth/oauth/identities', {
		signal,
	})

	return identities
}

/**
 * Disconnects the account of the provider.
 *
 * The gateway refuses with a `409` when the user then has no way to sign in: no
 * password, no other connected account, and no passkey.
 */
export async function unlinkIdentity(provider: SignInProvider): Promise<void> {
	await request(`/auth/oauth/identities/${provider}`, { method: 'DELETE' })
}
