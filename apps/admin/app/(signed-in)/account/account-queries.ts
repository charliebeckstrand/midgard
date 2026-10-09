'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sendVerificationEmail } from 'shared/auth'
import {
	addPasskey,
	confirmTotp,
	type Factors,
	fetchFactors,
	fetchIdentities,
	fetchPasskeys,
	generateRecoveryCodes,
	type Identity,
	type Passkey,
	type Provider,
	removePasskey,
	removeTotp,
	startTotpSetup,
	unlinkIdentity,
} from './account-api'

// Each mutation sets `inlineError`, because the page shows its error in place.

/**
 * The query keys, in one place. A reader and a writer name the same entry, and
 * an update that spelled a key a second way would change nothing.
 */
export const accountKeys = {
	passkeys: ['account', 'passkeys'] as const,
	factors: ['account', 'factors'] as const,
	identities: ['account', 'identities'] as const,
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
		meta: { inlineError: true },
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
		meta: { inlineError: true },
		mutationFn: removePasskey,
		onSuccess: (_, id) => {
			client.setQueryData<Passkey[]>(accountKeys.passkeys, (passkeys) =>
				passkeys?.filter((passkey) => passkey.id !== id),
			)

			client.invalidateQueries({ queryKey: accountKeys.factors })
		},
	})
}

/** Emails the signed-in user a new link that verifies the email. */
export function useSendVerificationEmail() {
	return useMutation({ mutationFn: sendVerificationEmail, meta: { inlineError: true } })
}

/** Starts adding an authenticator app. The caller keeps the secret it returns. */
export function useStartTotpSetup() {
	return useMutation({ mutationFn: startTotpSetup, meta: { inlineError: true } })
}

/** Turns on the authenticator app, and refetches the factors. */
export function useConfirmTotp() {
	const client = useQueryClient()

	return useMutation({
		meta: { inlineError: true },
		mutationFn: confirmTotp,
		onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.factors }),
	})
}

/** Removes the authenticator app, and refetches the factors. */
export function useRemoveTotp() {
	const client = useQueryClient()

	return useMutation({
		meta: { inlineError: true },
		mutationFn: removeTotp,
		onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.factors }),
	})
}

/** Makes new recovery codes, and refetches the factors. The caller shows the codes. */
export function useGenerateRecoveryCodes() {
	const client = useQueryClient()

	return useMutation({
		meta: { inlineError: true },
		mutationFn: generateRecoveryCodes,
		onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.factors }),
	})
}

/**
 * The GitHub and Google accounts of the signed-in user. The server page seeds
 * it, like {@link usePasskeys}.
 */
export function useIdentities(initialIdentities: Identity[]) {
	return useQuery({
		queryKey: accountKeys.identities,
		queryFn: ({ signal }) => fetchIdentities(signal),
		initialData: initialIdentities,
	})
}

/** Disconnects an account, and removes it from the cached list. */
export function useUnlinkIdentity() {
	const client = useQueryClient()

	return useMutation({
		meta: { inlineError: true },
		mutationFn: unlinkIdentity,
		onSuccess: (_, provider: Provider) => {
			client.setQueryData<Identity[]>(accountKeys.identities, (identities) =>
				identities?.filter((identity) => identity.provider !== provider),
			)
		},
	})
}
