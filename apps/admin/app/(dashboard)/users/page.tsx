import { readGateway, type User } from 'auth'

import { UsersClient } from './client'

/**
 * Fetches all users from the gateway, server-side.
 *
 * @internal
 * @returns The user list, or `[]` on a failure, which goes to the log.
 */
async function getUsers(): Promise<User[]> {
	return (await readGateway<{ data: User[] }>('/api/users'))?.data ?? []
}

export default async function UsersPage() {
	const users = await getUsers()

	return <UsersClient users={users} />
}
