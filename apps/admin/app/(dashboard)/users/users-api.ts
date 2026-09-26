import type { User } from 'auth'

/**
 * The requests that the users pages send from the client. Each goes to a
 * same-origin `/api/*` path, which the gateway serves (CONVENTIONS §6.3).
 */

/**
 * Sends one same-origin request and checks its status.
 *
 * A query or a mutation reads a thrown error as a failure. A non-OK response
 * does not throw by itself, so each call below goes through this check.
 */
async function request(path: string, init?: RequestInit): Promise<Response> {
	const response = await fetch(path, init)

	if (!response.ok) {
		throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status}`)
	}

	return response
}

/** Every user. */
export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
	const response = await request('/api/users', { signal })

	const { data } = (await response.json()) as { data: User[] }

	return data
}

/**
 * Deactivates or reactivates one user, and returns the changed record.
 *
 * The gateway signs a deactivated user out on each device. It refuses to change
 * an admin account with a `403`.
 */
export async function setUserActive(userId: string, isActive: boolean): Promise<User> {
	const response = await request(`/api/users/${encodeURIComponent(userId)}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ is_active: isActive }),
	})

	return (await response.json()) as User
}
