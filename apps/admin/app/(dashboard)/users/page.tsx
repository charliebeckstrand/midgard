import { bifrost, requireGateway, type User } from 'auth'

import { UsersClient } from './client'

/**
 * Fetches all users from the gateway, server-side.
 *
 * @internal
 * @returns The user list. A failed read throws, so an outage does not show an empty list.
 */
async function getUsers(): Promise<User[]> {
	const data = await requireGateway('/api/users', () => bifrost.GET('/api/users'))

	return data?.data ?? []
}

export default async function UsersPage() {
	const users = await getUsers()

	return <UsersClient users={users} />
}
