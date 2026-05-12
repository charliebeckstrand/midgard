import { bifrost, getUser } from 'heimdall'

import { UsersClient } from './client'

async function getUsers() {
	const res = await bifrost('/api/users')

	if (!res.ok) return []

	const { data } = await res.json()

	return data
}

export default async function UsersPage() {
	const [users, user] = await Promise.all([getUsers(), getUser()])

	return <UsersClient users={users} currentUser={user} />
}
