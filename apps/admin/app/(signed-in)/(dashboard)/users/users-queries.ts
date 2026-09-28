'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from 'auth'
import { fetchUsers, setUserActive } from './users-api'

/**
 * The query keys, in one place. A reader and a writer name the same entry, and
 * an update that spelled a key a second way would change nothing.
 */
export const usersKeys = {
	all: ['users'] as const,
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

/** Deactivates or reactivates one user, and writes the changed record into the cached list. */
export function useSetUserActive() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
			setUserActive(userId, isActive),
		onSuccess: (updated) => {
			client.setQueryData<User[]>(usersKeys.all, (users) =>
				users?.map((user) => (user.id === updated.id ? updated : user)),
			)
		},
	})
}
