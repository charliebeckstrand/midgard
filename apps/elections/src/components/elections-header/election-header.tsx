'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import type { ReactNode } from 'react'
import type { Election } from '../../elections/registry'
import { stateOfSlug } from '../../elections/us-states'
import { electionCrumbs } from '../../utilities/trail'
import { ElectionsHeader } from './elections-header'

/**
 * The header of the pages of an election, which its layout renders. The trail
 * ends at the election, and on a page of a state at the state, such as
 * `Elections › 2026 › United States › Midterms › Georgia`. The layout keeps the
 * header from page to page, so the header reads the segment under the
 * election for the state.
 */
export function ElectionHeader({ election, search }: { election: Election; search?: ReactNode }) {
	const segment = useSelectedLayoutSegment()

	const state = segment === null ? undefined : stateOfSlug(segment)

	return <ElectionsHeader crumbs={electionCrumbs(election, state)} search={search} />
}
