import type { User } from 'auth'
import type { ChatMessageData } from 'ui/modules/chat'
import type { Chat } from './[userId]/types'

/**
 * The requests that the users pages send from the client. Each goes to a
 * same-origin `/api/*` path, which the gateway serves (CONVENTIONS §6.3).
 */

/**
 * Sends one same-origin request and checks its status.
 *
 * A query or a mutation reads a thrown error as a failure. A non-OK response
 * does not throw by itself, so each call below goes through this check.
 */
async function request(path: string, init?: RequestInit): Promise<Response> {
	const response = await fetch(path, init)

	if (!response.ok) {
		throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status}`)
	}

	return response
}

/** Every user. */
export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
	const response = await request('/api/users', { signal })

	const { data } = (await response.json()) as { data: User[] }

	return data
}

/** Changes the email of one user. */
export async function saveUserEmail(userId: string, email: string): Promise<void> {
	await request(`/api/users/${encodeURIComponent(userId)}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email }),
	})
}

/** Removes one user. */
export async function deleteUser(userId: string): Promise<void> {
	await request(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

/** The chats of one user. */
export async function fetchUserChats(userId: string, signal?: AbortSignal): Promise<Chat[]> {
	const response = await request(`/api/users/${encodeURIComponent(userId)}/chats`, { signal })

	return (await response.json()) as Chat[]
}

/** The messages of one chat. */
export async function fetchChatMessages(
	chatId: string,
	signal?: AbortSignal,
): Promise<ChatMessageData[]> {
	const response = await request(`/api/chat/${encodeURIComponent(chatId)}`, { signal })

	const { messages } = (await response.json()) as { messages?: ChatMessageData[] }

	return messages ?? []
}

/** Removes one chat. */
export async function deleteChat(chatId: string): Promise<void> {
	await request(`/api/chat/${encodeURIComponent(chatId)}`, { method: 'DELETE' })
}
