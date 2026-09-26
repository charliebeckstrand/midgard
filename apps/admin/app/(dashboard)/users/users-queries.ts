'use client'

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from 'auth'
import type { Chat } from './[userId]/types'
import {
	deleteChat,
	fetchChatMessages,
	fetchUserChats,
	fetchUsers,
	setUserActive,
} from './users-api'

/**
 * The query keys, in one place. A reader and a writer name the same entry, and
 * an update that spelled a key a second way would change nothing.
 */
export const usersKeys = {
	all: ['users'] as const,
	chats: (userId: string) => ['users', userId, 'chats'] as const,
	messages: (chatId: string | null) => ['chats', chatId, 'messages'] as const,
}

/**
 * Every user. The server page fetches the list first and gives it here as
 * `initialData`, so the first render has no fetch.
 */
export function useUsers(initialUsers: User[]) {
	return useQuery({
		queryKey: usersKeys.all,
		queryFn: ({ signal }) => fetchUsers(signal),
		initialData: initialUsers,
	})
}

/**
 * The chats of one user, from the server page as `initialData`.
 *
 * The page gives `null` when its request failed. The query then has no data,
 * and the client fetches the list again.
 */
export function useUserChats(userId: string, initialChats: Chat[] | null) {
	return useQuery({
		queryKey: usersKeys.chats(userId),
		queryFn: ({ signal }) => fetchUserChats(userId, signal),
		initialData: initialChats ?? undefined,
	})
}

/**
 * The messages of one chat. `null` fetches nothing.
 *
 * The key holds the chat id, so a response goes to the entry of its own chat.
 * A slow response for one chat cannot replace the messages of the next chat.
 * When the reader moves away from a chat, its query loses its last observer,
 * and Query aborts the request.
 */
export function useChatMessages(chatId: string | null) {
	return useQuery({
		queryKey: usersKeys.messages(chatId),
		queryFn: chatId === null ? skipToken : ({ signal }) => fetchChatMessages(chatId, signal),
	})
}

/**
 * Deactivates or reactivates one user, and writes the changed user into the cached list.
 *
 * The gateway returns the user with its new `is_active` and `updated_at`, so
 * the list needs no refetch.
 */
export function useSetUserActive() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
			setUserActive(userId, isActive),
		onSuccess: (changed) => {
			client.setQueryData<User[]>(usersKeys.all, (users) =>
				users?.map((user) => (user.id === changed.id ? changed : user)),
			)
		},
	})
}

/** Removes one chat of a user, and removes that chat from the cached list. */
export function useDeleteChat(userId: string) {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (chatId: string) => deleteChat(chatId),
		onSuccess: (_result, chatId) => {
			client.setQueryData<Chat[]>(usersKeys.chats(userId), (chats) =>
				chats?.filter((chat) => chat.id !== chatId),
			)
		},
	})
}
