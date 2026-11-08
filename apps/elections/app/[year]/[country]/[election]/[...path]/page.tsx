import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LiveRefresh } from 'shared/refresh'
import { Stack } from 'ui/structure/stack'
import { NationalMap } from '@/components/national-map'
import { PageBody } from '@/components/page-frame'
import { PageTitle } from '@/components/page-title'
import { RaceCard, RaceCardGrid } from '@/components/race-card'
import { RacePage } from '@/components/race-page'
import { DelegationSummary, RaceSummary } from '@/components/race-summary'
import { StateCard } from '@/components/state-card'
import type { Contest, Election } from '@/elections/registry'
import type { UsState } from '@/elections/us-states'
import { type ElectionParams, readElection } from '@/server/params'
import { race } from '@/server/races'
import { type ContestResult, contestResult, electionResults } from '@/server/results'
import { districtName, parseRacePath, type RaceLocation, racePath } from '@/utilities/elections-url'
import { delegation, isCalled } from '@/utilities/race-math'
import { entryKey, isCounting, newestUpdate } from '@/utilities/results'
import { OVERVIEW, officeItems } from '@/utilities/trail'

type Params = { params: Promise<ElectionParams & { path: string[] }> }

/** The page reads the results before it renders, so the first frame has them. */
export const instant = false

/** The page that the path names, or the not-found page for a path that names none. */
async function readLocation(
	params: Params['params'],
): Promise<{ election: Election; location: RaceLocation }> {
	const [election, { path }] = await Promise.all([readElection(params), params])

	const location = parseRacePath(election, path)

	if (location === null) notFound()

	return { election, location }
}

/** The title of a location, such as `Georgia Senate, 2026 Midterms`. */
function locationTitle(election: Election, { region, contest, district }: RaceLocation): string {
	const name = `${election.year} ${election.name}`

	if (region === null) return contest === null ? name : `${name} ${contest.label}`

	if (contest === null) return `${region.name}, ${name}`

	if (district !== null) return `${region.name} ${districtName(district)}, ${name}`

	return `${region.name} ${contest.label}, ${name}`
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { election, location } = await readLocation(params)

	return { title: locationTitle(election, location) }
}

/** The races of a contest in a state. */
function stateEntries(result: ContestResult, state: UsState) {
	return result.entries.filter((entry) => entry.state.key === state.key)
}

/** The national map of an office. */
async function NationalPage({ election, contest }: { election: Election; contest: Contest }) {
	const result = await contestResult(contest)

	const counting = isCounting(result.entries)

	return (
		<PageBody status={{ counting, reporting: null, updated: result.national.updated }}>
			<LiveRefresh live={counting} />

			<NationalMap
				election={election}
				contest={contest}
				entries={result.entries}
				heading={contest.plural}
				items={officeItems(election, null)}
			/>
		</PageBody>
	)
}

/** A page of a state: its Overview tab, the tab of an office, or the page of a district. */
async function StatePage({
	election,
	location,
}: {
	election: Election
	location: RaceLocation & { region: UsState }
}) {
	const { region, contest, district } = location

	const results = await electionResults(election)

	const offices = new Set(
		results
			.filter((result) => stateEntries(result, region).length > 0)
			.map((result) => result.contest.slug),
	)

	if (contest !== null && !offices.has(contest.slug)) notFound()

	const items = officeItems(election, region, offices)

	if (contest === null) {
		const entries = results.flatMap((result) => stateEntries(result, region))

		const counting = isCounting(entries)

		return (
			<PageBody
				status={{
					counting,
					reporting: null,
					updated: newestUpdate(results.map((result) => result.national)),
				}}
			>
				<LiveRefresh live={counting} />

				<PageTitle heading={region.name} items={items} value={OVERVIEW} />

				<Stack gap="lg">
					{results.map((result) => {
						const races = stateEntries(result, region)

						const [only] = races

						if (only === undefined) return null

						const href = racePath(election, { region, contest: result.contest })

						return (
							<StateCard key={result.contest.slug} title={result.contest.label} href={href}>
								{result.contest.depth === 'district' ? (
									<DelegationSummary
										delegation={delegation(races.map((entry) => entry.candidates))}
									/>
								) : (
									<RaceSummary
										candidates={only.candidates}
										reporting={only.reporting}
										called={only.called}
									/>
								)}
							</StateCard>
						)
					})}
				</Stack>
			</PageBody>
		)
	}

	const result = results.find((entry) => entry.contest.slug === contest.slug)

	const races = result === undefined ? [] : stateEntries(result, region)

	if (contest.depth === 'district' && district === null) {
		const counting = isCounting(races)

		return (
			<PageBody status={{ counting, reporting: null, updated: result?.national.updated ?? null }}>
				<LiveRefresh live={counting} />

				<PageTitle heading={contest.label} items={items} value={contest.slug} />

				<StateCard title="Delegation" href={racePath(election, { region, contest })}>
					<DelegationSummary delegation={delegation(races.map((entry) => entry.candidates))} />
				</StateCard>

				<RaceCardGrid>
					{races.map((entry) => (
						<RaceCard
							key={entryKey(entry)}
							entry={entry}
							href={racePath(election, { region, contest, district: entry.district })}
						/>
					))}
				</RaceCardGrid>
			</PageBody>
		)
	}

	const entry = races.find((candidate) => candidate.district === district)

	if (entry === undefined) notFound()

	const read = await race(entry.raceId)

	const counting = read.reporting < 100 || !isCalled(read.candidates)

	const heading = district === null ? contest.label : districtName(district)

	return (
		<PageBody status={{ counting, reporting: read.reporting, updated: read.updated }}>
			<LiveRefresh live={counting} />

			<PageTitle heading={heading} special={read.special} items={items} value={contest.slug} />

			<RacePage
				race={read}
				stateName={region.name}
				raceLabel={
					district === null ? contest.label : `${contest.label}, ${districtName(district)}`
				}
			/>
		</PageBody>
	)
}

/**
 * Every page of an election under its overview: the national map of an
 * office, and the pages of a state and its districts.
 */
export default async function ElectionPage({ params }: Params) {
	const { election, location } = await readLocation(params)

	const { region, contest } = location

	if (region === null) {
		if (contest === null) notFound()

		return <NationalPage election={election} contest={contest} />
	}

	return <StatePage election={election} location={{ ...location, region }} />
}
