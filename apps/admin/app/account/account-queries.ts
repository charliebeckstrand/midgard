'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addPasskey, fetchPasskeys, type Passkey, removePasskey } from './account-api'

/**
 * The query keys, in one place. A reader and a writer name the same entry, and
 * an update that spelled a key a second way would change nothing.
 */
export const accountKeys = {
	passkeys: ['account', 'passkeys'] as const,
}

/**
 * The passkeys of the signed-in user. The server page fetches the list first
 * and gives it here as `initialData`, so the first render has no fetch.
 */
export function usePasskeys(initialPasskeys: Passkey[]) {
	return useQuery({
		queryKey: accountKeys.passkeys,
		queryFn: ({ signal }) => fetchPasskeys(signal),
		initialData: initialPasskeys,
	})
}

/** Adds a passkey, and writes it into the cached list. */
export function useAddPasskey() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: addPasskey,
		onSuccess: (added) => {
			client.setQueryData<Passkey[]>(accountKeys.passkeys, (passkeys) => [
				...(passkeys ?? []),
				added,
			])
		},
	})
}

/** Removes a passkey, and removes it from the cached list. */
export function useRemovePasskey() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: removePasskey,
		onSuccess: (_, id) => {
			client.setQueryData<Passkey[]>(accountKeys.passkeys, (passkeys) =>
				passkeys?.filter((passkey) => passkey.id !== id),
			)
		},
	})
}
