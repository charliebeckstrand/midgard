import { bifrost } from 'heimdall'
import { UserDetailsClient } from './client'

async function getUserDetails(userId: string) {
	const [details, chats] = await Promise.all([
		bifrost(`/api/users/${userId}`),
		bifrost(`/api/users/${userId}/chats`),
	])

	return {
		details: details.ok ? await details.json() : null,
		chats: chats.ok ? await chats.json() : null,
	}
}

export default async function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params

	const userDetails = await getUserDetails(userId)

	return <UserDetailsClient details={userDetails.details} chats={userDetails.chats} />
}
