'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { type Seed, seededQuery } from 'shared/queries'
import { fetchRace } from '../api/race-api'
import type { Race } from '../types'

/**
 * One race with its counties, for the Drawer, or no read for `null`. `seed` is
 * the race that the page read on the server for the step of the address, so a
 * reload paints the Drawer whole. It fills only the query of its own race.
 *
 * The query has no clock of its own. The Refresh button of the footer renders
 * the page again, and the page reads the race of the Drawer again into a new
 * seed. A seed that is newer than the entry replaces
 * the data of the entry, so the Drawer moves with the page and reads nothing
 * more. The query reads the race only for a step that the page did not seed,
 * such as a race that the reader opened after the last render of the page.
 *
 * @param id - The race, or `null` for a step that shows no one race.
 * @param seed - The race that the page read, or `null`.
 */
export function useRace(id: number | null, seed: Seed<Race> | null) {
	const client = useQueryClient()

	const seeded = seed !== null && seed.data.id === id ? seed : null

	// `seededQuery` fills only an empty entry, so a seed from a refresh goes in here.
	useEffect(() => {
		if (seeded === null) return

		const key = ['race', seeded.data.id]

		if ((client.getQueryState(key)?.dataUpdatedAt ?? 0) < seeded.readAt) {
			client.setQueryData(key, seeded.data, { updatedAt: seeded.readAt })
		}
	}, [client, seeded])

	return useQuery({
		queryKey: ['race', id],
		queryFn: ({ signal }) => fetchRace(id ?? 0, signal),
		enabled: id !== null,
		...(seeded !== null ? seededQuery(seeded) : {}),
	})
}
