'use client'

import { useMemo, useState } from 'react'
import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { MapPlat } from 'ui/map'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/structure/stack'
import type { Election } from '../../elections/registry'
import { stateOfFips, stateOfKey, type UsState } from '../../elections/us-states'
import { useDrawerParam } from '../../hooks/use-drawer-param'
import { STATES } from '../../utilities/atlas'
import { REGION_PARAM, racePath } from '../../utilities/elections-url'
import {
	type Delegation,
	shareLabel,
	signedLabel,
	signedMargin,
	signedShare,
} from '../../utilities/race-math'
import {
	closestRaces,
	delegations,
	delegationWinner,
	entryKey,
	type RaceEntry,
	raceWinner,
	WINNER_CATEGORIES,
} from '../../utilities/results'
import { RaceCard, RaceCardGrid } from '../race-card'
import { DelegationSummary, RaceSummary } from '../race-summary'
import { type DrawerView, ResultDrawer } from '../result-drawer'

/** The margin ramp, from a Democratic lead of 35 points through even to a Republican lead of 35. */
const MARGIN_RANGE = ['#1d4ed8', '#3b82f6', '#93c5fd', '#e4e4e7', '#fca5a5', '#ef4444', '#b91c1c']

/** The steps of the margin ramp fall at 5, 15, and 25 points. */
const MARGIN_DOMAIN: [number, number] = [-35, 35]

/** The seat-share ramp, from every seat Democratic through an even split to every seat Republican. */
const SHARE_RANGE = ['#1d4ed8', '#93c5fd', '#e4e4e7', '#fca5a5', '#b91c1c']

const SHARE_DOMAIN: [number, number] = [-50, 50]

/** One state of the map. */
type StateRow = { fips: string; value: number | null; winner: string | null }

/** Props for {@link NationalMap}. */
export type NationalMapProps = {
	election: Election
	/** The races of the office: one per state, or one per district for the House. */
	entries: readonly RaceEntry[]
}

/** The rows of the map: the value and the Winner category of each state. */
function stateRows(
	entries: readonly RaceEntry[],
	byState: ReadonlyMap<string, Delegation> | null,
): StateRow[] {
	if (byState !== null) {
		return [...byState].flatMap(([key, delegation]) => {
			const state = stateOfKey(key)

			return state === undefined
				? []
				: [
						{
							fips: state.fips,
							value: signedShare(delegation),
							winner: delegationWinner(delegation),
						},
					]
		})
	}

	return entries.map((entry) => ({
		fips: entry.state.fips,
		value: signedMargin(entry.candidates),
		winner: raceWinner(entry),
	}))
}

/**
 * The national map of an office. A Segment over the map switches its color
 * between the margin (the seat share on the House) and the winner. A click on
 * a state opens the Drawer on it (`?region=ga`), with the race of the state,
 * or its delegation on the House, and a link to the tab of the office on the
 * state page. Under the map, the closest races open the same Drawer.
 */
export function NationalMap({ election, entries }: NationalMapProps) {
	const [first] = entries

	const contest = first?.contest

	const districts = contest?.depth === 'district'

	const byState = useMemo(() => (districts ? delegations(entries) : null), [districts, entries])

	const rows = useMemo(() => stateRows(entries, byState), [entries, byState])

	const [mode, setMode] = useState<'value' | 'winner'>('value')

	const drawer = useDrawerParam(REGION_PARAM)

	const picked = drawer.value === null ? undefined : stateOfKey(drawer.value)

	if (contest === undefined) return null

	const view = picked === undefined ? null : drawerView(picked)

	function drawerView(state: UsState): DrawerView | null {
		if (contest === undefined) return null

		const open = (
			<Button href={racePath(election, { region: state, contest })} className="self-start">
				Open {state.name}
			</Button>
		)

		const delegation = byState?.get(state.key)

		if (byState !== null) {
			if (delegation === undefined) return null

			return {
				steps: [{ label: state.name }],
				subtitle: `${contest.label}, ${delegation.total} ${delegation.total === 1 ? 'seat' : 'seats'}`,
				body: (
					<Stack gap="lg">
						<DelegationSummary delegation={delegation} />
						{open}
					</Stack>
				),
			}
		}

		const entry = entries.find((candidate) => candidate.state.key === state.key)

		if (entry === undefined) return null

		return {
			steps: [{ label: state.name }],
			subtitle: contest.label,
			body: (
				<Stack gap="lg">
					<RaceSummary
						candidates={entry.candidates}
						reporting={entry.reporting}
						called={entry.called}
					/>
					{open}
				</Stack>
			),
		}
	}

	const valueRows = rows.filter((row) => row.value !== null)

	const winnerRows = rows.filter((row) => row.winner !== null)

	const present = new Set(winnerRows.map((row) => row.winner))

	const label = districts ? 'Seat share' : 'Margin'

	const common = {
		'aria-label': `${election.year} ${contest.label} results by state`,
		geography: STATES,
		projection: 'albers-usa',
		regionKey: 'fips',
		selectedRegion: picked?.fips ?? null,
		onRegionClick: (fips: string) => {
			const state = stateOfFips(fips)

			if (state !== undefined) drawer.open(state.key)
		},
	} as const

	return (
		<Stack gap="xl">
			<Stack gap="lg">
				<Segment
					value={mode}
					onValueChange={(next) => setMode(next === 'winner' ? 'winner' : 'value')}
				>
					<SegmentControl aria-label="Color the map by" className="self-start">
						<SegmentItem value="value">{label}</SegmentItem>
						<SegmentItem value="winner">Winner</SegmentItem>
					</SegmentControl>
				</Segment>

				{mode === 'value' ? (
					<MapPlat
						{...common}
						data={valueRows}
						valueKey="value"
						colorName={label}
						colorRange={districts ? SHARE_RANGE : MARGIN_RANGE}
						colorDomain={districts ? SHARE_DOMAIN : MARGIN_DOMAIN}
						bins={districts ? SHARE_RANGE.length : MARGIN_RANGE.length}
						binning="linear"
						formatValue={districts ? shareLabel : signedLabel}
						legend={{ placement: 'right' }}
					/>
				) : (
					<MapPlat
						{...common}
						data={winnerRows}
						categoryKey="winner"
						colorName="Winner"
						categories={WINNER_CATEGORIES.filter((category) => present.has(category.value))}
						legend="right"
					/>
				)}
			</Stack>

			<section>
				<Stack gap="lg">
					<Heading level={2}>Closest races</Heading>

					<RaceCardGrid>
						{closestRaces(entries, 6).map((entry) => (
							<RaceCard
								key={entryKey(entry)}
								entry={entry}
								onPick={() => drawer.open(entry.state.key)}
							/>
						))}
					</RaceCardGrid>
				</Stack>
			</section>

			<ResultDrawer view={view} onClose={drawer.close} />
		</Stack>
	)
}
