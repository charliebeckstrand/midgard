'use client'

import { usePathname } from 'next/navigation'
import { type Election, electionPath } from '../../elections/registry'
import { parseRacePath } from '../../utilities/elections-url'
import { electionCrumbs } from '../../utilities/trail'
import { ElectionsHeader } from './elections-header'

/** The location of a page that names none: the overview, so the trail still leads up. */
const OVERVIEW_LOCATION = { region: null, contest: null, district: null }

/**
 * The header of the pages of an election. It reads the trail from the path,
 * so the layout of the election holds it, and a navigation inside the
 * election keeps it in place.
 */
export function ElectionHeader({ election }: { election: Election }) {
	const pathname = usePathname()

	const base = electionPath(election)

	const segments = pathname.startsWith(base)
		? pathname.slice(base.length).split('/').filter(Boolean).map(decodeURIComponent)
		: []

	return (
		<ElectionsHeader
			crumbs={electionCrumbs(election, parseRacePath(election, segments) ?? OVERVIEW_LOCATION)}
		/>
	)
}
