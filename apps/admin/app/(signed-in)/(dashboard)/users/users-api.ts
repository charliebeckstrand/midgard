import type { User } from 'auth'
import { bifrost, unwrap } from 'shared/auth'

/**
 * The requests that the users pages send from the client. Each goes to a
 * same-origin `/api/*` path, which the gateway serves (CONVENTIONS §6.3).
 */

/** Every user. */
export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
	const { data } = await unwrap(bifrost.GET('/api/users', { signal }))

	return data
}

/**
 * Deactivates or reactivates one user, and returns the changed record.
 *
 * The gateway signs a deactivated user out on each device. It refuses to change
 * an admin account with a `403`.
 */
export async function setUserActive(userId: string, isActive: boolean): Promise<User> {
	return unwrap(
		bifrost.PATCH('/api/users/{id}', {
			params: { path: { id: userId } },
			body: { is_active: isActive },
		}),
	)
}
