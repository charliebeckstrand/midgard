import { cookies } from 'next/headers'

import { UsersClient } from './client'

async function getUsers() {
	const cookieStore = await cookies()

	const res = await fetch(`${process.env.BIFROST_URL || 'http://localhost:4000'}/api/users`, {
		headers: { cookie: cookieStore.toString() },
	})

	if (!res.ok) return []

	return res.json()
}

export default async function UsersPage() {
	const users = await getUsers()

	return <UsersClient users={users} />
}
