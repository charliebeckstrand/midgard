import { describe, expect, it } from 'vitest'
import { stateRows } from '../components/national-map/state-rows'
import { findContest, findElection } from '../elections/registry'
import { stateOfKey } from '../elections/us-states'
import { readNationalRace } from '../server/civic-race'
import { delegation } from '../utilities/race-math'
import {
	closestRaces,
	countyWinner,
	delegations,
	delegationWinner,
	entryName,
	entryStep,
	matchesSearch,
	partyCounties,
	type RaceEntry,
	raceWinner,
	readEntries,
	seatGroups,
	stateRaces,
	stepEntry,
} from '../utilities/results'
import { contestItems, electionCrumbs, officeItems } from '../utilities/trail'
import house from './fixtures/house.json'
import senate from './fixtures/senate.json'

const midterms = findElection('2026', 'us', 'midterms')

const senateContest = midterms && findContest(midterms, 'senate')

const houseContest = midterms && findContest(midterms, 'house')

if (midterms === undefined || senateContest === undefined || houseContest === undefined) {
	throw new Error('The registry has no 2026 midterms.')
}

const senateEntries = readEntries(senateContest, readNationalRace(87528, senate))

const houseEntries = readEntries(houseContest, readNationalRace(87524, house))

describe('the races of a contest', () => {
	it('reads each region into its state and district', () => {
		const ga06 = houseEntries.find((entry) => entry.state.key === 'ga' && entry.district === '06')

		expect(ga06 && entryName(ga06)).toBe('Georgia 6th District')

		expect(senateEntries.every((entry) => entry.district === null)).toBe(true)
	})

	it('finds a race by its district or a candidate, with each word of the query', () => {
		const ga06 = houseEntries.find((entry) => entry.state.key === 'ga' && entry.district === '06')

		if (ga06 === undefined) throw new Error('The fixture has no Georgia 6th District.')

		const [first] = ga06.candidates

		if (first === undefined) throw new Error('The Georgia 6th District has no candidate.')

		const race = { ...ga06, candidates: [{ ...first, name: 'Vicente González' }] }

		expect(matchesSearch(race, '')).toBe(true)

		expect(matchesSearch(race, '  6th  ')).toBe(true)

		expect(matchesSearch(race, 'GONZALEZ')).toBe(true)

		expect(matchesSearch(race, 'vicente 6th')).toBe(true)

		expect(matchesSearch(race, 'vicente 7th')).toBe(false)
	})

	it('gives the closest races first, and never an unopposed race', () => {
		const closest = closestRaces(senateEntries, 3)

		expect(closest).toHaveLength(3)

		expect(closest.map((entry) => entry.lead)).toEqual(
			[...closest.map((entry) => entry.lead)].sort((a, b) => (a ?? 0) - (b ?? 0)),
		)
	})
})

describe('the race of a step of the Drawer', () => {
	const results = [
		{ contest: senateContest, entries: senateEntries },
		{ contest: houseContest, entries: houseEntries },
	]

	const georgia = stateOfKey('ga')

	if (georgia === undefined) throw new Error('The states have no Georgia.')

	it('gives the race of a statewide office, or of a district', () => {
		const ga06 = houseEntries.find((entry) => entry.state.key === 'ga' && entry.district === '06')

		if (ga06 === undefined) throw new Error('The House has no Georgia 6th District.')

		expect(stepEntry(results, entryStep(ga06))).toBe(ga06)

		expect(
			stepEntry(results, { region: georgia, office: 'senate', district: null, county: null })?.state
				.key,
		).toBe('ga')
	})

	it('gives no race for the overview, or the delegation of a state', () => {
		expect(
			stepEntry(results, { region: georgia, office: null, district: null, county: null }),
		).toBeUndefined()

		expect(
			stepEntry(results, { region: georgia, office: 'house', district: null, county: null }),
		).toBeUndefined()
	})

	it('keeps each office in the races of a state, with only the races of the state', () => {
		const races = stateRaces(results, georgia)

		expect(races.map((office) => office.contest.slug)).toEqual(['senate', 'house'])

		expect(races.every((office) => office.entries.every((entry) => entry.state === georgia))).toBe(
			true,
		)
	})
})

describe('the seat chart', () => {
	it('puts the blue side first, the seats not called between, and the red side last', () => {
		const groups = seatGroups(houseContest, [
			{ party: 'Republican', name: 'Republicans', slot: 'red', seats: 161 },
			{ party: 'Democratic', name: 'Democrats', slot: 'blue', seats: 252 },
		])

		expect(groups.map((group) => [group.label, group.seats])).toEqual([
			['Democrats', 252],
			['Not called', 22],
			['Republicans', 161],
		])
	})
})

describe('the Winner map', () => {
	it('colors a statewide race by its winner, or by the lead of its leader', () => {
		const ga = senateEntries.find((entry) => entry.state.key === 'ga')

		const ak = senateEntries.find((entry) => entry.state.key === 'ak')

		expect(ga && raceWinner(ga)).toBe('Democratic')

		expect(ak && raceWinner(ak)).toBe('Democratic lead')
	})

	it('colors a county by the side of its leader, soft while it counts', () => {
		const candidate = (slot: 'blue' | 'red', votes: number) => ({
			name: slot,
			party: slot,
			slot,
			votes,
			percent: 0,
			winner: false,
			incumbent: false,
		})

		const leads = [candidate('red', 900), candidate('blue', 600)]

		expect(countyWinner({ candidates: leads, reporting: 100 })).toBe('Republican')

		expect(countyWinner({ candidates: leads, reporting: 40 })).toBe('Republican lead')

		expect(countyWinner({ candidates: [candidate('blue', 0)], reporting: 0 })).toBeNull()
	})

	it('marks a tie of the called seats of a state as Split', () => {
		const byState = delegations(houseEntries)

		const montana = byState.get('mt')

		expect(montana && delegationWinner(montana)).toBe('Split')

		expect(delegationWinner(delegation([]))).toBeNull()
	})

	it('gives a delegation to a side with most of its seats, and a lead short of that', () => {
		const seat = (party: string, slot: 'blue' | 'red', winner: boolean) => [
			{ name: party, party, slot, votes: 1, percent: 50, winner, incumbent: false },
		]

		const won = delegation([
			seat('D', 'blue', true),
			seat('D', 'blue', true),
			seat('R', 'red', false),
		])

		expect(delegationWinner(won)).toBe('Democratic')

		const open = delegation([
			seat('D', 'blue', true),
			seat('R', 'red', true),
			seat('R', 'red', false),
		])

		expect(delegationWinner(open)).toBe('Split')

		const lead = delegation([
			seat('R', 'red', true),
			seat('D', 'blue', false),
			seat('D', 'blue', false),
		])

		expect(delegationWinner(lead)).toBe('Republican lead')
	})

	it('gives a delegation with no called seat the lead of the side that leads most of its seats', () => {
		const seat = (party: string, slot: 'blue' | 'red') => [
			{ name: party, party, slot, votes: 1, percent: 50, winner: false, incumbent: false },
		]

		// An at-large seat that is not called, such as Alaska.
		expect(delegationWinner(delegation([seat('R', 'red')]))).toBe('Republican lead')

		expect(
			delegationWinner(delegation([seat('D', 'blue'), seat('D', 'blue'), seat('R', 'red')])),
		).toBe('Democratic lead')

		// A tie of the leads has no category.
		expect(delegationWinner(delegation([seat('D', 'blue'), seat('R', 'red')]))).toBeNull()
	})

	it('keeps a row for a state with a race and no category, so the map opens it', () => {
		const leader = (party: string, slot: 'blue' | 'red') => [
			{ name: party, party, slot, votes: 0, percent: 0, winner: false, incumbent: false },
		]

		const ak = houseEntries.find((entry) => entry.state.key === 'ak')

		if (ak === undefined) throw new Error('The House fixture has no Alaska race.')

		// Two seats not called, each led by another side: a tie of the leads.
		const tied: RaceEntry[] = [
			{ ...ak, candidates: leader('D', 'blue') },
			{ ...ak, district: '02', candidates: leader('R', 'red') },
		]

		expect(stateRows(tied, delegations(tied))).toEqual([{ fips: '02', winner: null }])
	})
})

describe('the trail and the office switch', () => {
	it('reads the trail of an election from the list of every election down to the election', () => {
		const crumbs = electionCrumbs(midterms)

		expect(crumbs.map((crumb) => crumb.label)).toEqual([
			'Elections',
			'2026',
			'United States',
			'Midterms',
		])

		expect(crumbs[0]?.href).toBe('/')
	})

	it('ends the trail of a page of a state at the state', () => {
		const georgia = stateOfKey('ga')

		const crumbs = electionCrumbs(midterms, georgia)

		expect(crumbs.at(-1)).toEqual({ label: 'Georgia', href: '/2026/us/midterms/georgia' })

		expect(crumbs.at(-2)).toEqual({ label: 'Midterms', href: '/2026/us/midterms' })
	})

	it('leads the switch of a state to the pages of the state, with no pick for an office it has no race of', () => {
		const georgia = stateOfKey('ga')

		if (georgia === undefined) throw new Error('The states have no Georgia.')

		const items = officeItems(midterms, { state: georgia, offices: new Set(['house']) })

		expect(items.map((item) => [item.href, item.disabled])).toEqual([
			['/2026/us/midterms/georgia', false],
			['/2026/us/midterms/georgia/senate', true],
			['/2026/us/midterms/georgia/house', false],
			['/2026/us/midterms/georgia/governor', true],
		])
	})

	it('leads the page switch with the overview', () => {
		expect(officeItems(midterms).map((item) => item.value)).toEqual([
			'overview',
			'senate',
			'house',
			'governor',
		])
	})

	it('keeps an office with no race in the state, disabled', () => {
		const items = contestItems(midterms, new Set(['house', 'governor']))

		expect(items.map((item) => [item.value, item.disabled])).toEqual([
			['senate', true],
			['house', false],
			['governor', false],
		])
	})
})

describe('the counties of many races', () => {
	const candidate = (party: string, slot: 'blue' | 'red', votes: number) => ({
		name: `${party} candidate`,
		party,
		slot,
		votes,
		percent: 0,
		winner: false,
		incumbent: false,
	})

	it('adds the votes of each party in a county over the races, and keeps the lowest percent reporting', () => {
		const counties = partyCounties([
			[
				{
					fips: '13121',
					name: 'Fulton',
					reporting: 100,
					candidates: [candidate('Democratic', 'blue', 300), candidate('Republican', 'red', 100)],
				},
			],
			[
				{
					fips: '13121',
					name: 'Fulton',
					reporting: 80,
					candidates: [candidate('Republican', 'red', 250), candidate('Democratic', 'blue', 50)],
				},
				{
					fips: '13089',
					name: 'DeKalb',
					reporting: 100,
					candidates: [candidate('Democratic', 'blue', 90), candidate('Republican', 'red', 10)],
				},
			],
		])

		expect(counties).toHaveLength(2)

		const [fulton, dekalb] = counties

		expect(fulton?.reporting).toBe(80)

		expect(fulton?.candidates.map((row) => [row.party, row.votes, row.percent])).toEqual([
			['Democratic', 350, 50],
			['Republican', 350, 50],
		])

		expect(dekalb?.candidates.map((row) => [row.party, row.votes])).toEqual([
			['Democratic', 90],
			['Republican', 10],
		])

		expect(countyWinner(dekalb ?? { candidates: [], reporting: 0 })).toBe('Democratic')
	})
})
