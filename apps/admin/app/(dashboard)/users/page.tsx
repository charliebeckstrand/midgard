import { bifrost, type User } from 'auth'

import { UsersClient } from './client'

/**
 * Fetches all users from the gateway, server-side.
 *
 * @internal
 * @returns The user list, or `[]` on a non-OK response.
 */
async function getUsers(): Promise<User[]> {
	const { data } = await bifrost.GET('/api/users')

	return data?.data ?? []
}

export default async function UsersPage() {
	const users = await getUsers()

	return <UsersClient users={users} />
}
