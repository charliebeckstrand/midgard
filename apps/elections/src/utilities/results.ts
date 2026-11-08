import type { MapCategory } from 'ui/map'
import type { Contest } from '../elections/registry'
import { stateOfKey, type UsState } from '../elections/us-states'
import type { Candidate, NationalRace, PartySeats, PartySlot, RegionRace } from '../types'
import { districtName, districtOfKey } from './elections-url'
import { type Delegation, delegation, isCalled, lead } from './race-math'

/**
 * The races of a contest as the screens read them: each race with its office,
 * its state, and its district. The national race of a contest gives them.
 */

/** One race of a contest, such as the Georgia Senate race or the 6th District of Georgia. */
export type RaceEntry = {
	contest: Contest
	state: UsState
	/** The district of a district race, such as `06`, or `null` for a statewide race. */
	district: string | null
	raceId: number
	reporting: number
	/** The candidates, most votes first. */
	candidates: Candidate[]
	called: boolean
	/** The lead in points, or `null` for an unopposed race. */
	lead: number | null
}

/**
 * The races of a contest from its national race. A region whose key names no
 * state throws, as the parser does for a field it cannot read.
 */
export function readEntries(contest: Contest, national: NationalRace): RaceEntry[] {
	return national.regions.map((region) => readEntry(contest, region))
}

function readEntry(contest: Contest, region: RegionRace): RaceEntry {
	const [stateKey = ''] = region.key.split('-')

	const state = stateOfKey(stateKey)

	if (state === undefined) throw new Error(`The region ${region.key} names no state of the US.`)

	const district = contest.depth === 'district' ? districtOfKey(region.key) : null

	if (contest.depth === 'district' && district === null) {
		throw new Error(`The region ${region.key} names no district.`)
	}

	return {
		contest,
		state,
		district,
		raceId: region.raceId,
		reporting: region.reporting,
		candidates: region.candidates,
		called: isCalled(region.candidates),
		lead: lead(region.candidates),
	}
}

/** The name of a race without its office: `Georgia`, or `Georgia 6th District`. */
export function entryName(entry: Pick<RaceEntry, 'state' | 'district'>): string {
	return entry.district === null
		? entry.state.name
		: `${entry.state.name} ${districtName(entry.district)}`
}

/** The office of a race with its place: `Georgia Senate`, or `House - 6th District`. */
export function officeName(entry: Pick<RaceEntry, 'contest' | 'state' | 'district'>): string {
	return entry.district === null
		? `${entry.state.name} ${entry.contest.label}`
		: `${entry.contest.label} - ${districtName(entry.district)}`
}

/** A key of a race that is unique in an election, such as `senate:ga` or `house:ga-06`. */
export function entryKey(entry: RaceEntry): string {
	const region = entry.district === null ? entry.state.key : `${entry.state.key}-${entry.district}`

	return `${entry.contest.slug}:${region}`
}

/**
 * The races with the smallest lead, closest first. An unopposed race has no
 * lead, so it is never close.
 *
 * @param entries - The races to pick from.
 * @param count - The most races to give.
 */
export function closestRaces(entries: readonly RaceEntry[], count: number): RaceEntry[] {
	return entries
		.filter((entry): entry is RaceEntry & { lead: number } => entry.lead !== null)
		.sort((a, b) => a.lead - b.lead)
		.slice(0, count)
}

/** One group of seats of a seat chart. */
export type SeatGroup = {
	label: string
	seats: number
	slot: PartySlot | 'zinc'
	hollow?: boolean
}

/** The order of the parties on the arc, from the start side: blue, then amber, then red. */
const ARC_ORDER: Record<string, number> = { blue: 0, amber: 1, red: 3 }

/**
 * The seats of a chamber as the groups of a seat chart. The blue parties come
 * first and the red parties last, with the other parties and the seats not
 * called between them, so the majority line falls between the two sides.
 */
export function seatGroups(contest: Contest, parties: readonly PartySeats[]): SeatGroup[] {
	const held = parties.reduce((sum, party) => sum + party.seats, 0)

	const open = Math.max(0, contest.seats - held)

	const groups: (SeatGroup & { order: number })[] = parties.map((party) => ({
		label: party.name,
		seats: party.seats,
		slot: party.slot,
		order: ARC_ORDER[party.slot] ?? 1,
	}))

	if (open > 0)
		groups.push({ label: 'Not called', seats: open, slot: 'zinc', hollow: true, order: 2 })

	return groups.sort((a, b) => a.order - b.order).map(({ order: _order, ...group }) => group)
}

/** The seats of each state of a district contest, by state key. */
export function delegations(entries: readonly RaceEntry[]): Map<string, Delegation> {
	const byState = new Map<string, Candidate[][]>()

	for (const entry of entries) {
		const districts = byState.get(entry.state.key) ?? []

		districts.push(entry.candidates)

		byState.set(entry.state.key, districts)
	}

	return new Map([...byState].map(([key, districts]) => [key, delegation(districts)]))
}

/** Whether votes are still counted: a race that is not fully in, or not called. */
export function isCounting(entries: readonly Pick<RaceEntry, 'reporting' | 'called'>[]): boolean {
	return entries.some((entry) => entry.reporting < 100 || !entry.called)
}

/** The newest update of a set of national races, as an ISO time, or `null` for none. */
export function newestUpdate(races: readonly { updated: string }[]): string | null {
	return races.reduce<string | null>(
		(newest, race) =>
			newest === null || Date.parse(race.updated) > Date.parse(newest) ? race.updated : newest,
		null,
	)
}

/** The name of the side of a slot on a two-party map, for the categories of the Winner map. */
const SIDE: Partial<Record<PartySlot, string>> = {
	blue: 'Democratic',
	red: 'Republican',
	amber: 'Independent and other',
}

/** The categories of the Winner map, in the order of its legend. */
export const WINNER_CATEGORIES: readonly MapCategory[] = [
	{ value: 'Democratic', color: 'blue' },
	{ value: 'Democratic lead', color: 'blue', tone: 'soft' },
	{ value: 'Split', color: 'blue', stripes: 'red' },
	{ value: 'Independent and other lead', color: 'amber', tone: 'soft' },
	{ value: 'Independent and other', color: 'amber' },
	{ value: 'Republican lead', color: 'red', tone: 'soft' },
	{ value: 'Republican', color: 'red' },
]

/**
 * The category of a statewide race on the Winner map: the side of the winner,
 * or the lead of the side of the leader while the race is not called.
 */
export function raceWinner(entry: Pick<RaceEntry, 'candidates' | 'called'>): string | null {
	const leader = entry.called
		? entry.candidates.find((candidate) => candidate.winner)
		: entry.candidates[0]

	const side = leader === undefined ? undefined : SIDE[leader.slot]

	if (side === undefined) return null

	return entry.called ? side : `${side} lead`
}

/**
 * The category of a delegation on the Winner map. A side with the most seats
 * of the state is the winner. A side that leads the called seats short of that
 * leads. An even split of the called seats is `Split`, and a delegation with
 * no called seat has no category.
 */
export function delegationWinner(state: Delegation): string | null {
	const [first, second] = state.parties

	if (first === undefined) return null

	if (second !== undefined && second.seats === first.seats) return 'Split'

	const side = SIDE[first.slot]

	if (side === undefined) return null

	return first.seats > state.total / 2 ? side : `${side} lead`
}
