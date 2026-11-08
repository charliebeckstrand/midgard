import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Heading } from 'ui/heading'
import { ElectionList } from '@/components/election-list'
import { PageFrame } from '@/components/page-frame'
import { ELECTIONS, findElections } from '@/elections/registry'
import { listedElections, yearCrumbs } from '@/utilities/trail'

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

	return (
		<PageFrame crumbs={yearCrumbs(year)}>
			<Heading level={1}>{year} elections</Heading>

			<ElectionList elections={listedElections(elections)} />
		</PageFrame>
	)
}
