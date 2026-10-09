'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	type Ban,
	fetchBans,
	fetchThreats,
	removeBan,
	resolveThreat,
	type Threat,
} from './security-api'

// Each mutation sets `inlineError`, because the page shows its error in place.

/** The query keys, in one place (see `usersKeys`). */
export const securityKeys = {
	threats: ['security', 'threats'] as const,
	bans: ['security', 'bans'] as const,
}

/** The newest threats. The server page gives the first list as `initialData`. */
export function useThreats(initialThreats: Threat[]) {
	return useQuery({
		queryKey: securityKeys.threats,
		queryFn: ({ signal }) => fetchThreats(signal),
		initialData: initialThreats,
	})
}

/** The bans in force. The server page gives the first list as `initialData`. */
export function useBans(initialBans: Ban[]) {
	return useQuery({
		queryKey: securityKeys.bans,
		queryFn: ({ signal }) => fetchBans(signal),
		initialData: initialBans,
	})
}

/** Resolves or reopens one threat, and writes the changed threat into the cached list. */
export function useResolveThreat() {
	const client = useQueryClient()

	return useMutation({
		meta: { inlineError: true },
		mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
			resolveThreat(id, resolved),
		onSuccess: (updated) => {
			client.setQueryData<Threat[]>(securityKeys.threats, (threats) =>
				threats?.map((threat) => (threat.id === updated.id ? updated : threat)),
			)
		},
	})
}

/** Removes the ban on one address, and removes it from the cached list. */
export function useRemoveBan() {
	const client = useQueryClient()

	return useMutation({
		meta: { inlineError: true },
		mutationFn: (ip: string) => removeBan(ip),
		onSuccess: (_, ip) => {
			client.setQueryData<Ban[]>(securityKeys.bans, (bans) => bans?.filter((ban) => ban.ip !== ip))
		},
	})
}
