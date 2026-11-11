import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LevelPage } from '@/components/level-page'
import { ELECTIONS, findElections } from '@/utilities/registry'
import { countryCrumbs } from '@/utilities/trail'

type Params = { params: Promise<{ year: string; country: string }> }

/** The years and the countries of the registry, which prerender with the build. */
export function generateStaticParams(): { year: string; country: string }[] {
	const pairs = new Set(ELECTIONS.map((election) => `${election.year}/${election.country}`))

	return [...pairs].map((pair) => {
		const [year = '', country = ''] = pair.split('/')

		return { year, country }
	})
}

/** The elections of a country in a year. */
async function readCountry(params: Params['params']) {
	const { year, country } = await params

	const elections = findElections(year, country)

	const [first] = elections

	if (first === undefined) notFound()

	return { year, countryName: first.countryName, elections }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { year, countryName } = await readCountry(params)

	return { title: `${year} elections, ${countryName}` }
}

/** The elections of a country in a year. */
export default async function CountryPage({ params }: Params) {
	const { year, countryName, elections } = await readCountry(params)

	return (
		<LevelPage
			crumbs={countryCrumbs(year, countryName)}
			heading={`${year} elections, ${countryName}`}
			elections={elections}
		/>
	)
}
