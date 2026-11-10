import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AutoUpdateRefresh } from '@/components/auto-update'
import { ElectionDrawer } from '@/components/election-drawer'
import { findElection } from '@/elections/registry'
import { drawerSeed, type SearchParams } from '@/server/drawer'
import { type ElectionParams, readSection, type SectionParams } from '@/server/params'
import { electionResults } from '@/server/results'
import { isCounting } from '@/utilities/results'

type Params = { params: Promise<SectionParams>; searchParams: SearchParams }

/**
 * The offices of each election of the registry, which prerender with the
 * build, as the layout does. A state renders on its first visit.
 */
export function generateStaticParams({
	params,
}: {
	params: ElectionParams
}): { section: string }[] {
	const election = findElection(params.year, params.country, params.election)

	return (election?.contests ?? []).map((contest) => ({ section: contest.slug }))
}

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
 *
 * The refresh runs while any race of the election is counted, not only a race
 * of the page, because the Drawer opens on each office and gets its race from
 * the refresh. A section with no race renders the not-found page.
 */
export default async function SectionPage({ params, searchParams }: Params) {
	const section = await readSection(params)

	const { election } = section

	const all = await electionResults(election)

	const entries = all.flatMap((result) => result.entries)

	const own =
		section.kind === 'office'
			? entries.filter((entry) => entry.contest.slug === section.contest.slug)
			: entries.filter((entry) => entry.state.key === section.state.key)

	if (own.length === 0) notFound()

	const seed = await drawerSeed(election, all, searchParams)

	return (
		<>
			<AutoUpdateRefresh live={isCounting(entries)} />

			<ElectionDrawer election={election} seed={seed} />
		</>
	)
}
