import { Columns } from 'ui/structure/columns'
import type { StateOffice } from '../../server/state'
import type { Election } from '../../utilities/registry'
import { closestRaces, isCounting, newestUpdate } from '../../utilities/results'
import { OVERVIEW, officeItems, type StateScope } from '../../utilities/trail'
import { statePath } from '../../utilities/url'
import type { UsState } from '../../utilities/us-states'
import { ClosestRaces } from '../closest-races'
import { OfficeCard } from '../office-card'
import { PageBody } from '../page-frame'
import { PageTitle } from '../page-title'
import { StateMap } from '../state-map'

/** The state of a page and the offices with a race in it, for the office switch. */
function stateScope(state: UsState, offices: readonly StateOffice[]): StateScope {
	return { state, offices: new Set(offices.map((office) => office.contest.slug)) }
}

/**
 * The overview of a state in an election: a card of each office with a race
 * in the state, which leads to the page of the office in the state. A
 * statewide office shows its race, and the House shows the delegation.
 */
export function StateOverviewView({
	election,
	state,
	offices,
}: {
	election: Election
	state: UsState
	offices: readonly StateOffice[]
}) {
	const entries = offices.flatMap((office) => office.entries)

	return (
		<PageBody
			status={{
				counting: isCounting(entries),
				updated: newestUpdate(
					offices.flatMap((office) =>
						office.updated === null ? [] : [{ updated: office.updated }],
					),
				),
			}}
		>
			<PageTitle
				heading={state.name}
				items={officeItems(election, stateScope(state, offices))}
				value={OVERVIEW}
			/>

			<Columns columns={{ initial: 1, md: 2, lg: 3 }}>
				{offices.map(({ contest, entries: races }) => (
					<OfficeCard
						key={contest.slug}
						contest={contest}
						entries={races}
						href={statePath(election, state, contest)}
					/>
				))}
			</Columns>
		</PageBody>
	)
}

/**
 * An office of an election in a state: the map of its counties, then its races
 * that are not called, closest first, and its called races. Each group shows
 * only when it holds a race. A card opens its race in the Drawer.
 */
export function StateOfficeView({
	election,
	state,
	office,
	offices,
	aspect,
}: {
	election: Election
	state: UsState
	office: StateOffice
	offices: readonly StateOffice[]
	/** The ratio of the width to the height of the state, for the frame of the map. */
	aspect: number
}) {
	const { contest, entries, counties, updated } = office

	const uncalled = entries.filter((entry) => !entry.called)

	return (
		<PageBody status={{ counting: isCounting(entries), updated }}>
			<PageTitle
				heading={state.name}
				items={officeItems(election, stateScope(state, offices))}
				value={contest.slug}
			/>

			<StateMap
				election={election}
				contest={contest}
				state={state}
				entries={entries}
				counties={counties}
				aspect={aspect}
			/>

			<ClosestRaces election={election} entries={closestRaces(uncalled, uncalled.length)} />

			<ClosestRaces
				election={election}
				entries={entries
					.filter((entry) => entry.called)
					.sort((a, b) => (a.district ?? '').localeCompare(b.district ?? ''))}
				heading="Called races"
			/>
		</PageBody>
	)
}
