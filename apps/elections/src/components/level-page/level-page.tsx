import { ELECTIONS, type Election } from '../../elections/registry'
import { searchedElections } from '../../server/results'
import { electionDays } from '../../utilities/levels'
import { type Crumb, listedElections } from '../../utilities/trail'
import { CountryFlag } from '../country-flag'
import { LevelView } from '../level-view'
import { PageFrame } from '../page-frame'
import { RaceSearch, RaceSearchProvider } from '../race-search'

/** Props for {@link LevelPage}. */
export type LevelPageProps = {
	crumbs: readonly Crumb[]
	/** The name of the page for a screen reader, such as `2026 elections`. The trail shows it. */
	heading: string
	/** The elections of the scope of the page. */
	elections: readonly Election[]
}

/**
 * A level page: every election, the elections of a year, or the elections of
 * a country in a year. Each level is the same page over the elections of its
 * scope (`LevelView`). The trail of the header is its visible title, so the
 * heading of the body is only for a screen reader. The search of the header
 * holds every election at each level. The page renders the flag of each
 * country on the server, and writes the text of each election day there. The
 * page shows no results, so it has no footer.
 */
export async function LevelPage({ crumbs, heading, elections }: LevelPageProps) {
	const searched = await searchedElections(listedElections(ELECTIONS))

	return (
		<PageFrame
			crumbs={crumbs}
			search={
				<RaceSearchProvider>
					<RaceSearch elections={searched} />
				</RaceSearchProvider>
			}
		>
			<h1 className="sr-only">{heading}</h1>

			<LevelView
				elections={elections}
				flags={Object.fromEntries(
					elections.map((election) => [
						election.country,
						<CountryFlag key={election.country} country={election.country} />,
					]),
				)}
				days={electionDays(elections)}
			/>
		</PageFrame>
	)
}
