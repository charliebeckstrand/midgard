import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ElectionDrawer } from '@/components/election-drawer'
import { getDrawerSeed, type SearchParams } from '@/server/drawer'
import { type ElectionParams, readSection, type SectionParams } from '@/server/params'
import { getElectionResults } from '@/server/results'
import { findElection } from '@/utilities/registry'
import { pageTitle } from '@/utilities/trail'

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

	return { title: pageTitle(election, name) }
}

/**
 * The page of an office of an election, or the overview of a state. A layout
 * renders the view: the national map of the office, or the overview of the
 * state. The page holds the Drawer. A section with no race renders the
 * not-found page.
 */
export default async function SectionPage({ params, searchParams }: Params) {
	const section = await readSection(params)

	const { election } = section

	const all = await getElectionResults(election)

	const entries = all.flatMap((result) => result.entries)

	const own =
		section.kind === 'office'
			? entries.filter((entry) => entry.contest.slug === section.contest.slug)
			: entries.filter((entry) => entry.state.key === section.state.key)

	if (own.length === 0) notFound()

	const seed = await getDrawerSeed(election, all, searchParams)

	return <ElectionDrawer election={election} seed={seed} />
}
