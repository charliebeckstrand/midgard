'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Seed, seededQuery } from 'shared/queries'
import {
	type Ban,
	fetchBans,
	fetchThreats,
	removeBan,
	resolveThreat,
	type Threat,
} from './security-api'

/** The query keys, in one place (see `usersKeys`). */
export const securityKeys = {
	threats: ['security', 'threats'] as const,
	bans: ['security', 'bans'] as const,
}

/** The newest threats. The server page seeds the first list (see `seededQuery`). */
export function useThreats(initialThreats: Seed<Threat[]>) {
	return useQuery({
		queryKey: securityKeys.threats,
		queryFn: ({ signal }) => fetchThreats(signal),
		...seededQuery(initialThreats),
	})
}

/** The bans in force. The server page seeds the first list (see `seededQuery`). */
export function useBans(initialBans: Seed<Ban[]>) {
	return useQuery({
		queryKey: securityKeys.bans,
		queryFn: ({ signal }) => fetchBans(signal),
		...seededQuery(initialBans),
	})
}

/** Resolves or reopens one threat, and writes the changed threat into the cached list. */
export function useResolveThreat() {
	const client = useQueryClient()

	return useMutation({
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
		mutationFn: (ip: string) => removeBan(ip),
		onSuccess: (_, ip) => {
			client.setQueryData<Ban[]>(securityKeys.bans, (bans) => bans?.filter((ban) => ban.ip !== ip))
		},
	})
}
