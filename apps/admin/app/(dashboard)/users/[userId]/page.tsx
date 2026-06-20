import { bifrost } from 'auth'
import type { User } from 'auth/user'
import type { Chat } from 'shared/chat'
import { UserDetailsClient } from './client'

async function getUserDetails(
	userId: string,
): Promise<{ details: User | null; chats: Chat[] | null }> {
	const [details, chats] = await Promise.all([
		bifrost(`/api/users/${userId}`),
		bifrost(`/api/users/${userId}/chats`),
	])

	return {
		details: details.ok ? ((await details.json()) as User) : null,
		chats: chats.ok ? ((await chats.json()) as Chat[]) : null,
	}
}

export default async function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params

	const userDetails = await getUserDetails(userId)

	return <UserDetailsClient details={userDetails.details} chats={userDetails.chats} />
}
