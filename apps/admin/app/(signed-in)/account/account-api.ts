import {
	type PublicKeyCredentialCreationOptionsJSON,
	startRegistration,
} from '@simplewebauthn/browser'
import type { Schema, SignInProvider } from 'auth'
import { bifrost, unwrap } from 'shared/auth'
import { downloadBlob } from 'ui/core'

/**
 * The requests that the account page sends from the client. Each goes to a
 * same-origin `/auth/*` path, which the gateway serves (CONVENTIONS §6.3).
 */

/** A passkey of the signed-in user, as the gateway lists it. */
export type Passkey = Schema<'Passkey'>

/** The passkeys of the signed-in user. */
export async function fetchPasskeys(signal?: AbortSignal): Promise<Passkey[]> {
	const { data } = await unwrap(bifrost.GET('/auth/passkeys', { signal }))

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
	const options = await unwrap(bifrost.POST('/auth/passkeys/options'))

	// The gateway passes the options of the browser API through, so its spec names no fields.
	const optionsJSON = options as PublicKeyCredentialCreationOptionsJSON

	const credential = await startRegistration({ optionsJSON })

	return unwrap(bifrost.POST('/auth/passkeys', { body: credential }))
}

/**
 * Removes one passkey of the signed-in user.
 *
 * The gateway refuses to remove the last second factor of an admin with a `409`.
 */
export async function removePasskey(id: string): Promise<void> {
	await unwrap(bifrost.DELETE('/auth/passkeys/{id}', { params: { path: { id } } }))
}

/** The second factors of the signed-in user, as the gateway reports them. */
export type Factors = Schema<'Factors'>

/** A new authenticator-app secret, before the user confirms it. */
export type TotpSetup = Schema<'TotpSetup'>

/** The second factors of the signed-in user. */
export async function fetchFactors(signal?: AbortSignal): Promise<Factors> {
	return unwrap(bifrost.GET('/auth/mfa', { signal }))
}

/**
 * Starts adding an authenticator app. The app stays off until
 * {@link confirmTotp} sends a code from it.
 */
export async function startTotpSetup(): Promise<TotpSetup> {
	return unwrap(bifrost.POST('/auth/mfa/totp/setup'))
}

/** Turns on the authenticator app with a code that it shows now. */
export async function confirmTotp(code: string): Promise<void> {
	await unwrap(bifrost.POST('/auth/mfa/totp', { body: { code } }))
}

/**
 * Removes the authenticator app.
 *
 * The gateway refuses to remove the last second factor of an admin with a `409`.
 */
export async function removeTotp(): Promise<void> {
	await unwrap(bifrost.DELETE('/auth/mfa/totp'))
}

/** Replaces the recovery codes, and returns the new ones. The gateway shows them only this once. */
export async function generateRecoveryCodes(): Promise<string[]> {
	const { codes } = await unwrap(bifrost.POST('/auth/mfa/recovery-codes'))

	return codes
}

/** A provider that a user can sign in with. */
export type Provider = SignInProvider

/** A GitHub or Google account connected to the signed-in user. */
export type Identity = Schema<'Identity'>

/** The GitHub and Google accounts connected to the signed-in user. */
export async function fetchIdentities(signal?: AbortSignal): Promise<Identity[]> {
	const { identities } = await unwrap(bifrost.GET('/auth/oauth/identities', { signal }))

	return identities
}

/**
 * Disconnects the account of the provider.
 *
 * The gateway refuses with a `409` when the user then has no way to sign in: no
 * password, no other connected account, and no passkey.
 */
export async function unlinkIdentity(provider: Provider): Promise<void> {
	await unwrap(
		bifrost.DELETE('/auth/oauth/identities/{provider}', { params: { path: { provider } } }),
	)
}

/** Everything that the gateway keeps about the signed-in user. */
export type AccountExport = Schema<'AccountExport'>

/**
 * Downloads everything that the gateway keeps about the signed-in user, as a
 * JSON file.
 */
export async function downloadAccount(): Promise<void> {
	const data: AccountExport = await unwrap(bifrost.GET('/auth/account/export'))

	downloadBlob(
		new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
		`account-${data.exported_at.slice(0, 10)}.json`,
	)
}

/**
 * Deletes the account of the signed-in user and all of its data, and loads
 * `/login`.
 *
 * @remarks
 * The gateway accepts it only soon after the sign-in, and after the second
 * step. It refuses an admin with a `403`. A full page load, like a sign-out,
 * so that no data of the user stays in a query cache.
 */
export async function deleteAccount(): Promise<void> {
	await unwrap(bifrost.DELETE('/auth/account'))

	window.location.replace('/login')
}
