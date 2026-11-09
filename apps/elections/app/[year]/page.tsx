import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LevelPage } from '@/components/level-page'
import { ELECTIONS, findElections } from '@/elections/registry'
import { yearCrumbs } from '@/utilities/trail'

type Params = { params: Promise<{ year: string }> }

/** The years of the registry, which prerender with the build. */
export function generateStaticParams(): { year: string }[] {
	return [...new Set(ELECTIONS.map((election) => String(election.year)))].map((year) => ({ year }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { year } = await params

	return { title: `${year} elections` }
}

/** The elections of a year, of every country. */
export default async function YearPage({ params }: Params) {
	const { year } = await params

	const elections = findElections(year)

	if (elections.length === 0) notFound()

	return <LevelPage crumbs={yearCrumbs(year)} heading={`${year} elections`} elections={elections} />
}
