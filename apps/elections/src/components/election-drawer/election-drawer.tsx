'use client'

import { useState } from 'react'
import type { Seed } from 'shared/queries'
import { Stack } from 'ui/structure/stack'
import type { Election } from '../../elections/registry'
import { useDrawerStep } from '../../hooks/use-drawer-step'
import { useRace } from '../../queries/race-queries'
import type { Race } from '../../types'
import { type DrawerStep, districtName, OVERVIEW } from '../../utilities/elections-url'
import { delegation } from '../../utilities/race-math'
import {
	entryKey,
	type OfficeRaces,
	type RaceEntry,
	stateRaces,
	stepEntry,
} from '../../utilities/results'
import { officeItems } from '../../utilities/trail'
import { OfficeCard } from '../office-card'
import { RaceCard } from '../race-card'
import { RaceDetail } from '../race-detail'
import { DelegationSummary, RaceSummary } from '../race-summary'
import { type DrawerView, ResultDrawer, type TrailCrumb } from '../result-drawer'

/** Props for {@link ElectionDrawer}. */
export type ElectionDrawerProps = {
	election: Election
	/** The races of each office, in the order of the registry. */
	results: readonly OfficeRaces[]
	/** The race of the step of the address, which the page read on the server, or `null`. */
	seed: Seed<Race> | null
}

/** Moves the Drawer to a step, or closes it with `null`. */
type Go = (step: DrawerStep | null) => void

/** The open state of the county table of a race. */
type CountiesOpen = { open: boolean; onOpenChange: (open: boolean) => void }

/** Whether the votes of a race are still counted. */
function counting(entry: Pick<RaceEntry, 'reporting' | 'called'>): boolean {
	return entry.reporting < 100 || !entry.called
}

/**
 * The trail of a step: the state, which leads to its overview; the office, with
 * the menu of the offices of the state; and the district, where there is one.
 * The caller adds the county.
 */
function drawerTrail(
	election: Election,
	races: readonly OfficeRaces[],
	step: DrawerStep,
	go: Go,
): TrailCrumb[] {
	const { region } = step

	const offices = new Set(
		races.filter((office) => office.entries.length > 0).map((office) => office.contest.slug),
	)

	const items = officeItems(election, offices)

	const deeper = step.district !== null || step.county !== null

	const trail: TrailCrumb[] = [
		{
			label: region.name,
			onPick:
				step.office === OVERVIEW
					? undefined
					: () => go({ region, office: OVERVIEW, district: null, county: null }),
		},
		{
			label: items.find((item) => item.value === step.office)?.label ?? step.office,
			onPick: deeper
				? () => go({ region, office: step.office, district: null, county: null })
				: undefined,
			menu: items.map((item) => ({
				label: item.label,
				disabled: item.disabled,
				onPick: () => go({ region, office: item.value, district: null, county: null }),
			})),
		},
	]

	if (step.district !== null) {
		trail.push({
			label: districtName(step.district),
			onPick: step.county === null ? undefined : () => go({ ...step, county: null }),
		})
	}

	return trail
}

/** The overview of a state: a card of each office with a race in the state, which leads to the office. */
function StateOverview({
	races,
	step,
	go,
}: {
	races: readonly OfficeRaces[]
	step: DrawerStep
	go: Go
}) {
	return (
		<Stack gap="lg">
			{races.map(({ contest, entries }) => {
				const [only] = entries

				if (only === undefined) return null

				return (
					<OfficeCard
						key={contest.slug}
						title={contest.label}
						onPick={() =>
							go({ region: step.region, office: contest.slug, district: null, county: null })
						}
					>
						{contest.depth === 'district' ? (
							<DelegationSummary delegation={delegation(entries.map((race) => race.candidates))} />
						) : (
							<RaceSummary
								candidates={only.candidates}
								reporting={only.reporting}
								called={only.called}
							/>
						)}
					</OfficeCard>
				)
			})}
		</Stack>
	)
}

/** The delegation of a state, then a card of each district, which leads to the district. */
function StateDelegation({ office, step, go }: { office: OfficeRaces; step: DrawerStep; go: Go }) {
	return (
		<Stack gap="lg">
			<DelegationSummary delegation={delegation(office.entries.map((race) => race.candidates))} />

			{office.entries.map((district) => (
				<RaceCard
					key={entryKey(district)}
					entry={district}
					onPick={() => go({ ...step, district: district.district, county: null })}
				/>
			))}
		</Stack>
	)
}

/**
 * The view of one race: the race in full, or one county of it. The county shows
 * once the race loads; until then the Drawer holds the race.
 */
function raceView(
	entry: RaceEntry,
	race: Race | undefined,
	trail: TrailCrumb[],
	step: DrawerStep,
	go: Go,
	counties: CountiesOpen,
): DrawerView {
	const subtitle = race?.special ? 'Special election' : undefined

	const county =
		step.county === null
			? undefined
			: race?.counties.find((candidate) => candidate.fips === step.county)

	if (county !== undefined) {
		return {
			steps: [...trail, { label: county.name }],
			subtitle,
			body: (
				<RaceSummary
					candidates={county.candidates}
					reporting={county.reporting}
					called={entry.called}
					rows="all"
				/>
			),
		}
	}

	return {
		steps: trail,
		subtitle,
		body: (
			<RaceDetail
				entry={entry}
				race={race}
				onCounty={(fips) => go({ ...step, county: fips })}
				countiesOpen={counties.open}
				onCountiesOpenChange={counties.onOpenChange}
			/>
		),
	}
}

/**
 * The view of a step: the overview of the state, the delegation of the House,
 * or one race. `null` for a step whose race the results do not hold.
 */
function drawerView(
	election: Election,
	results: readonly OfficeRaces[],
	step: DrawerStep,
	entry: RaceEntry | undefined,
	race: Race | undefined,
	go: Go,
	counties: CountiesOpen,
): DrawerView | null {
	const races = stateRaces(results, step.region)

	const trail = drawerTrail(election, races, step, go)

	const office = races.find((candidate) => candidate.contest.slug === step.office)

	if (office === undefined) {
		return { steps: trail, body: <StateOverview races={races} step={step} go={go} /> }
	}

	if (entry !== undefined) return raceView(entry, race, trail, step, go, counties)

	if (office.contest.depth !== 'district' || step.district !== null) return null

	return { steps: trail, body: <StateDelegation office={office} step={step} go={go} /> }
}

/**
 * The Drawer of an election, on each page of it. A state opens it; the address
 * holds its step (see {@link useDrawerStep}).
 *
 * Its trail is the state, the office, then the district and the county where
 * the reader went that deep, such as `Georgia › House › 6th District › Fulton`.
 * The state leads to its overview. The office crumb opens the offices of the
 * state, and an office with no race in the state is disabled.
 *
 * - The overview: a card of each office of the state, which leads to the office.
 * - A statewide office or a district: the race in full, with its counties.
 * - The House: the delegation of the state, then a card of each district.
 * - A county: the race in that county.
 */
export function ElectionDrawer({ election, results, seed }: ElectionDrawerProps) {
	const { step, go } = useDrawerStep(election)

	const entry = step === null ? undefined : stepEntry(results, step)

	const read = useRace(entry?.raceId ?? null, seed, entry !== undefined && counting(entry))

	const race = read.data?.id === entry?.raceId ? read.data : undefined

	// The county table starts closed on each race, and stays open across a visit to one of its counties.
	const [openRace, setOpenRace] = useState<number | null>(null)

	const counties: CountiesOpen = {
		open: entry !== undefined && openRace === entry.raceId,
		onOpenChange: (open) => setOpenRace(open && entry !== undefined ? entry.raceId : null),
	}

	const view = step === null ? null : drawerView(election, results, step, entry, race, go, counties)

	return <ResultDrawer view={view} onClose={() => go(null)} />
}
