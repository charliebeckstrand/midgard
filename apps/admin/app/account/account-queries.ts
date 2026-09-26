'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	addPasskey,
	confirmTotp,
	type Factors,
	fetchFactors,
	fetchPasskeys,
	generateRecoveryCodes,
	type Passkey,
	removePasskey,
	removeTotp,
	startTotpSetup,
} from './account-api'

/**
 * The query keys, in one place. A reader and a writer name the same entry, and
 * an update that spelled a key a second way would change nothing.
 */
export const accountKeys = {
	passkeys: ['account', 'passkeys'] as const,
	factors: ['account', 'factors'] as const,
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

/**
 * The second factors of the signed-in user. The server page seeds it, like
 * {@link usePasskeys}.
 */
export function useFactors(initialFactors: Factors) {
	return useQuery({
		queryKey: accountKeys.factors,
		queryFn: ({ signal }) => fetchFactors(signal),
		initialData: initialFactors,
	})
}

/** Adds a passkey, writes it into the cached list, and refetches the factors. */
export function useAddPasskey() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: addPasskey,
		onSuccess: (added) => {
			client.setQueryData<Passkey[]>(accountKeys.passkeys, (passkeys) => [
				...(passkeys ?? []),
				added,
			])

			client.invalidateQueries({ queryKey: accountKeys.factors })
		},
	})
}

/** Removes a passkey, removes it from the cached list, and refetches the factors. */
export function useRemovePasskey() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: removePasskey,
		onSuccess: (_, id) => {
			client.setQueryData<Passkey[]>(accountKeys.passkeys, (passkeys) =>
				passkeys?.filter((passkey) => passkey.id !== id),
			)

			client.invalidateQueries({ queryKey: accountKeys.factors })
		},
	})
}

/** Starts adding an authenticator app. The caller keeps the secret it returns. */
export function useStartTotpSetup() {
	return useMutation({ mutationFn: startTotpSetup })
}

/** Turns on the authenticator app, and refetches the factors. */
export function useConfirmTotp() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: confirmTotp,
		onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.factors }),
	})
}

/** Removes the authenticator app, and refetches the factors. */
export function useRemoveTotp() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: removeTotp,
		onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.factors }),
	})
}

/** Makes new recovery codes, and refetches the factors. The caller shows the codes. */
export function useGenerateRecoveryCodes() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: generateRecoveryCodes,
		onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.factors }),
	})
}
