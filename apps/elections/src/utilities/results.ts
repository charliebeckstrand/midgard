import type { MapCategory } from 'ui/map'
import type { Contest } from '../elections/registry'
import { stateOfKey, type UsState } from '../elections/us-states'
import type {
	Candidate,
	CountyResult,
	NationalRace,
	PartySeats,
	PartySlot,
	RegionRace,
} from '../types'
import { type DrawerStep, districtName, districtOfKey } from './elections-url'
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

/** One call of a race: the race, its winner, and when civicAPI called it. */
export type RaceCall = {
	entry: RaceEntry
	winner: Candidate
	/** When civicAPI called the race. */
	at: string
}

/** The name of a race without its office: `Georgia`, or `Georgia 6th District`. */
export function entryName(entry: Pick<RaceEntry, 'state' | 'district'>): string {
	return entry.district === null
		? entry.state.name
		: `${entry.state.name} ${districtName(entry.district)}`
}

/** A text for a search: lower case and with no accents, so that `gonzalez` finds `González`. */
export function searchText(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase()
}

/** The words of a query, each as a text for a search (`searchText`). */
export function searchWords(query: string): string[] {
	return searchText(query).split(/\s+/).filter(Boolean)
}

/**
 * Whether texts match a search: each word of the query is in one of the
 * texts, with no regard to case or accents. An empty query matches each text.
 */
export function matchesWords(texts: readonly string[], query: string): boolean {
	const words = searchWords(query)

	if (words.length === 0) return true

	const text = searchText(texts.join(' '))

	return words.every((word) => text.includes(word))
}

/**
 * Whether a race matches a search: each word of the query is in the name of
 * the race or in the name of one of its candidates. An empty query matches
 * each race.
 */
export function matchesSearch(entry: RaceEntry, query: string): boolean {
	return matchesWords(
		[entryName(entry), ...entry.candidates.map((candidate) => candidate.name)],
		query,
	)
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

/** The races of one office, as the Drawer reads them. */
export type OfficeRaces = { contest: Contest; entries: readonly RaceEntry[] }

/** The races of each office in one state, in the order of the registry. */
export function stateRaces(results: readonly OfficeRaces[], state: UsState): OfficeRaces[] {
	return results.map(({ contest, entries }) => ({
		contest,
		entries: entries.filter((entry) => entry.state.key === state.key),
	}))
}

/**
 * The race that a step of the Drawer shows in full: the race of a statewide
 * office, or of a district. The overview and the delegation of a state show no
 * one race, so they give `undefined`, as does a race that the results do not hold.
 */
export function stepEntry(
	results: readonly OfficeRaces[],
	step: DrawerStep,
): RaceEntry | undefined {
	const office = results.find((result) => result.contest.slug === step.office)

	if (office === undefined) return undefined

	if (office.contest.depth === 'district' && step.district === null) return undefined

	return office.entries.find(
		(entry) => entry.state.key === step.region.key && entry.district === step.district,
	)
}

/** The step of the Drawer on the race of an entry: its office in its state, or its district. */
export function entryStep(entry: RaceEntry): DrawerStep {
	return {
		region: entry.state,
		office: entry.contest.slug,
		district: entry.district,
		view: 'overview',
		county: null,
	}
}

/** Whether votes are still counted: a race that is not fully in, or not called. */
export function isCounting(entries: readonly Pick<RaceEntry, 'reporting' | 'called'>[]): boolean {
	return entries.some((entry) => entry.reporting < 100 || !entry.called)
}

/** The newest update of a set of races, as an ISO time, or `null` for none. */
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

/**
 * The categories of the Winner map, in the order of its legend. A race that is
 * not called takes the soft tone of the side that leads it, so it reads apart
 * from a win.
 */
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
 * The category of a county on the county map: the side of its leader. It takes
 * the solid tone once the county counted all of its vote, and the soft tone
 * while it counts. A county with no votes has no category.
 */
export function countyWinner(
	county: Pick<CountyResult, 'candidates' | 'reporting'>,
): string | null {
	const [leader] = county.candidates

	const side = leader === undefined || leader.votes === 0 ? undefined : SIDE[leader.slot]

	if (side === undefined) return null

	return county.reporting >= 100 ? side : `${side} lead`
}

/**
 * The category of a delegation on the Winner map. A side with more than half
 * of the seats of the state is the winner. A tie of the two largest sides of
 * the called seats is `Split`. Short of that, the side with the most called
 * seats is the winner when every seat is called, and leads while a seat is
 * not. A delegation with no called seat takes the lead of the side that leads
 * the most of its seats, as a statewide race that is not called does. With no
 * seat called and a tie of the leads, or with no seat, it has no category.
 */
export function delegationWinner(state: Delegation): string | null {
	const [first, second] = state.parties

	if (first === undefined) {
		const [leader, runnerUp] = state.leads

		const side = leader === undefined ? undefined : SIDE[leader.slot]

		if (side === undefined || (runnerUp !== undefined && runnerUp.seats === leader?.seats)) {
			return null
		}

		return `${side} lead`
	}

	const side = SIDE[first.slot]

	if (first.seats > state.total / 2) return side ?? null

	if (second !== undefined && second.seats === first.seats) return 'Split'

	if (side === undefined) return null

	return state.called === state.total ? side : `${side} lead`
}

/**
 * The counties of many races of one office in a state, such as the districts
 * of the House, as one county map: the votes of each party in each county,
 * added over the races. A county counts all of its vote once each race counts
 * all of its vote there, so it takes the lowest percent reporting of its
 * races. Each party is one row, most votes first, and no row is a winner.
 *
 * @param races - The counties of each race.
 */
export function partyCounties(races: readonly (readonly CountyResult[])[]): CountyResult[] {
	const byFips = new Map<string, { county: CountyResult; votes: Map<string, Candidate> }>()

	for (const counties of races) {
		for (const county of counties) {
			const held = byFips.get(county.fips) ?? {
				county: { ...county, candidates: [] },
				votes: new Map<string, Candidate>(),
			}

			held.county.reporting = Math.min(held.county.reporting, county.reporting)

			for (const candidate of county.candidates) {
				const party = held.votes.get(candidate.party)

				held.votes.set(candidate.party, {
					name: candidate.party,
					party: candidate.party,
					slot: candidate.slot,
					votes: (party?.votes ?? 0) + candidate.votes,
					percent: 0,
					winner: false,
					incumbent: false,
				})
			}

			byFips.set(county.fips, held)
		}
	}

	return [...byFips.values()].map(({ county, votes }) => {
		const total = [...votes.values()].reduce((sum, party) => sum + party.votes, 0)

		const candidates = [...votes.values()]
			.map((party) => ({ ...party, percent: total === 0 ? 0 : (party.votes / total) * 100 }))
			.sort((a, b) => b.votes - a.votes)

		return { ...county, candidates }
	})
}
