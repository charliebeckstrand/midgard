import { describe, expect, it } from 'vitest'
import { findContest, findElection } from '../elections/registry'
import { stateOfKey } from '../elections/us-states'
import { readNationalRace } from '../server/civic-race'
import { delegation } from '../utilities/race-math'
import {
	closestRaces,
	delegations,
	delegationWinner,
	entryName,
	entryStep,
	raceWinner,
	readEntries,
	seatGroups,
	stateRaces,
	stepEntry,
} from '../utilities/results'
import { electionCrumbs, officeItems } from '../utilities/trail'
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
			stepEntry(results, { region: georgia, office: 'overview', district: null, county: null }),
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

	it('keeps an office with no race in the state, disabled', () => {
		const items = officeItems(midterms, new Set(['house', 'governor']))

		expect(items.map((item) => [item.value, item.disabled])).toEqual([
			['overview', false],
			['senate', true],
			['house', false],
			['governor', false],
		])
	})
})
