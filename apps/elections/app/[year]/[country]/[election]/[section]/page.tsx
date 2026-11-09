import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LiveRefresh } from 'shared/refresh'
import { ElectionDrawer } from '@/components/election-drawer'
import { drawerSeed, officeRaces, type SearchParams } from '@/server/drawer'
import { readSection, type SectionParams } from '@/server/params'
import { electionResults } from '@/server/results'
import { isCounting } from '@/utilities/results'

type Params = { params: Promise<SectionParams>; searchParams: SearchParams }

/** The page reads the results before it renders, so the first frame has them. */
export const instant = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const section = await readSection(params)

	const { election } = section

	const name = section.kind === 'office' ? section.contest.label : section.state.name

	return { title: `${election.year} ${election.name} ${name}` }
}

/**
 * The page of an office of an election, or the overview of a state. A layout
 * renders the view: the national map of the office, or the overview of the
 * state. The page holds the Drawer and the live refresh.
 */
export default async function SectionPage({ params, searchParams }: Params) {
	const section = await readSection(params)

	const { election } = section

	const all = await electionResults(election)

	const entries =
		section.kind === 'office'
			? all.find((result) => result.contest.slug === section.contest.slug)?.entries
			: all
					.flatMap((result) => result.entries)
					.filter((entry) => entry.state.key === section.state.key)

	if (entries === undefined || entries.length === 0) notFound()

	const seed = await drawerSeed(election, officeRaces(all), searchParams)

	return (
		<>
			<LiveRefresh live={isCounting(entries)} />

			<ElectionDrawer election={election} seed={seed} />
		</>
	)
}
