import { bifrost } from 'heimdall'

import { UserDetailsClient } from './client'

async function getUserDetails(userId: string) {
	const res = await bifrost(`/api/users/${userId}`)

	if (!res.ok) return null

	return res.json()
}

export default async function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params

	const user = await getUserDetails(userId)

	return <UserDetailsClient user={user} />
}
