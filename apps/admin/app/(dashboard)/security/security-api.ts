import type { Schema } from 'auth'
import { bifrost, unwrap } from 'shared/auth'

/**
 * The requests that the security page sends from the client. Each goes to a
 * same-origin `/api/*` path, which the gateway serves (CONVENTIONS §6.3). The
 * gateway gets the data from Vidar, and answers `503` when Vidar is not
 * available.
 */

/** A threat that Vidar found, such as repeated failed sign-ins from one address. */
export type Threat = Schema<'Threat'>

/** A ban on one address. */
export type Ban = Schema<'Ban'>

/** The newest threats. */
export async function fetchThreats(signal?: AbortSignal): Promise<Threat[]> {
	const { data } = await unwrap(bifrost.GET('/api/security/threats', { signal }))

	return data
}

/** The bans in force. */
export async function fetchBans(signal?: AbortSignal): Promise<Ban[]> {
	const { data } = await unwrap(bifrost.GET('/api/security/bans', { signal }))

	return data
}

/** Marks a threat as handled, or opens it again, and returns the changed threat. */
export async function resolveThreat(id: string, resolved: boolean): Promise<Threat> {
	return unwrap(
		bifrost.PATCH('/api/security/threats/{id}', {
			params: { path: { id } },
			body: { resolved },
		}),
	)
}

/** Removes the ban on one address. */
export async function removeBan(ip: string): Promise<void> {
	await unwrap(bifrost.DELETE('/api/security/bans/{ip}', { params: { path: { ip } } }))
}
