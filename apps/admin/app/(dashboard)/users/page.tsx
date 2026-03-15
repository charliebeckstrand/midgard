import { bifrost } from 'heimdall'

import { UsersClient } from './client'

async function getUsers() {
	const res = await bifrost('/api/users')

	if (!res.ok) return []

	return res.json()
}

export default async function UsersPage() {
	const users = await getUsers()

	return <UsersClient users={users} />
}
