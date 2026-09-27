import type { User } from 'auth'
import { createRequest } from 'shared/http'

/**
 * The requests that the users pages send from the client. Each goes to a
 * same-origin `/api/*` path, which the gateway serves (CONVENTIONS §6.3).
 */

/** The checked requests. The error of a refused request holds the gateway's message. */
const { json, send } = createRequest()

/** Every user. */
export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
	const { data } = await json<{ data: User[] }>('/api/users', { signal })

	return data
}

/**
 * Deactivates or reactivates one user, and returns the changed record.
 *
 * The gateway signs a deactivated user out on each device. It refuses to change
 * an admin account with a `403`.
 */
export function setUserActive(userId: string, isActive: boolean): Promise<User> {
	return send<User>(`/api/users/${encodeURIComponent(userId)}`, 'PATCH', { is_active: isActive })
}
