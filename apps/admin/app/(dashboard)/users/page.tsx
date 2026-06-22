import { bifrost, getUser } from 'auth'
import type { User } from 'auth/user'

import { UsersClient } from './client'

/**
 * Fetches all users from the gateway, server-side.
 *
 * @internal
 * @returns The user list, or `[]` on a non-OK response.
 */
async function getUsers(): Promise<User[]> {
	const res = await bifrost('/api/users')

	if (!res.ok) return []

	const { data } = (await res.json()) as { data: User[] }

	return data
}

export default async function UsersPage() {
	const [users, user] = await Promise.all([getUsers(), getUser()])

	return <UsersClient users={users} currentUser={user} />
}
