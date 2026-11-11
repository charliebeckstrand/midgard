import type { Delegation } from '../../utilities/race-math'
import { delegationWinner, type RaceEntry, raceWinner } from '../../utilities/results'
import { findStateByKey } from '../../utilities/us-states'

/** One state of the national map: its Winner category, or `null` for a state with a race and no category yet. */
export type StateRow = { fips: string; winner: string | null }

/**
 * The rows of the national map: the Winner category of each state that has a
 * race of the office. The page computes them on the server, so it sends one
 * row for each state and not each race of the office. A state whose race has
 * no category yet, such as a race with no votes, keeps its row, so the map
 * still opens it.
 *
 * @param entries - The races of the office: one per state, or one per district for the House.
 * @param byState - The delegation of each state for an office by district, or `null`.
 */
export function stateRows(
	entries: readonly RaceEntry[],
	byState: ReadonlyMap<string, Delegation> | null,
): StateRow[] {
	const rows =
		byState === null
			? entries.map((entry) => ({ fips: entry.state.fips, winner: raceWinner(entry) }))
			: [...byState].map(([key, delegation]) => ({
					fips: findStateByKey(key)?.fips,
					winner: delegationWinner(delegation),
				}))

	return rows.flatMap(({ fips, winner }) => (fips === undefined ? [] : [{ fips, winner }]))
}
