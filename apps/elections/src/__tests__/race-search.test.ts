import { describe, expect, it } from 'vitest'
import { type Election, findContest, findElection } from '../elections/registry'
import { readNationalRace } from '../server/civic-race'
import { electionsSearchGroups, SEARCH_LIMIT, searchGroups } from '../utilities/race-search'
import { entryKey, type OfficeRaces, readEntries } from '../utilities/results'
import governors from './fixtures/governors.json'
import house from './fixtures/house.json'
import senate from './fixtures/senate.json'

const midterms = findElection('2026', 'us', 'midterms')

const contest = (slug: string) => {
	const found = midterms && findContest(midterms, slug)

	if (found === undefined) throw new Error(`The 2026 midterms have no ${slug} office.`)

	return found
}

const races: OfficeRaces[] = [
	{
		contest: contest('senate'),
		entries: readEntries(contest('senate'), readNationalRace(87528, senate)),
	},
	{
		contest: contest('house'),
		entries: readEntries(contest('house'), readNationalRace(87524, house)),
	},
	{
		contest: contest('governor'),
		entries: readEntries(contest('governor'), readNationalRace(87535, governors)),
	},
]

const headings = (query: string) => searchGroups(races, query).map((group) => group.heading)

describe('the search of an election', () => {
	it('lists nothing for an empty query', () => {
		expect(searchGroups(races, '')).toEqual([])

		expect(searchGroups(races, '  ')).toEqual([])
	})

	it('finds a state, then its races of each office, with at most the limit of each', () => {
		const groups = searchGroups(races, 'georgia')

		expect(groups.map((group) => group.heading)).toEqual(['States', 'Senate', 'House', 'Governor'])

		expect(groups[0]?.rows).toEqual([
			expect.objectContaining({
				label: 'Georgia',
				description: 'Senate, House, Governor',
				slot: null,
				step: expect.objectContaining({ region: expect.objectContaining({ key: 'ga' }) }),
			}),
		])

		expect(groups[2]?.rows).toHaveLength(SEARCH_LIMIT)

		expect(groups[2]?.rows[0]?.label).toBe('Georgia 1st District')
	})

	it('lists the states that match, by name, with at most the limit', () => {
		const names = searchGroups(races, 'a')[0]?.rows.map((row) => row.label) ?? []

		expect(names).toHaveLength(SEARCH_LIMIT)

		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
	})

	it('finds a race by its office and its district, and opens the Drawer on it', () => {
		const [house] = searchGroups(races, 'georgia house 6th')

		expect(house?.heading).toBe('House')

		expect(house?.rows).toHaveLength(1)

		expect(house?.rows[0]).toMatchObject({
			key: 'house:ga-06',
			label: 'Georgia 6th District',
			step: { region: { key: 'ga' }, office: 'house', district: '06', county: null },
		})
	})

	it('finds a race by a candidate, and names its two leaders', () => {
		const [race] = searchGroups(races, 'georgia senate')[0]?.rows ?? []

		const leader = race?.description.split(', ')[0]

		if (race === undefined || leader === undefined) throw new Error('No Georgia Senate race.')

		expect(race.description.split(', ').length).toBeLessThanOrEqual(2)

		const groups = searchGroups(races, leader.toUpperCase())

		expect(
			groups.find((group) => group.heading === 'Senate')?.rows.map((row) => row.key),
		).toContain('senate:ga')
	})

	it('names a candidate after the two leaders when the query finds that candidate', () => {
		const entry = races
			.flatMap((office) => office.entries)
			.find((race) => {
				const surname = race.candidates[2]?.name.split(' ').at(-1)?.toLowerCase()

				return (
					surname !== undefined &&
					race.candidates
						.slice(0, 2)
						.every((leader) => !leader.name.toLowerCase().includes(surname))
				)
			})

		const [first, second, third] = entry?.candidates ?? []

		if (entry === undefined || first === undefined || second === undefined || third === undefined) {
			throw new Error('No race has a third candidate.')
		}

		const surname = third.name.split(' ').at(-1) ?? ''

		const row = searchGroups(races, `${entry.state.name} ${surname}`)
			.flatMap((group) => group.rows)
			.find((found) => found.key === entryKey(entry))

		expect(row?.description).toBe(`${first.name}, ${second.name}, ${third.name}`)
	})

	it('names no other candidate when the race or its leaders hold each word', () => {
		const rows = searchGroups(races, 'a').flatMap((group) => group.rows)

		for (const row of rows.filter((found) => found.slot !== null)) {
			expect(row.description.split(', ').length).toBeLessThanOrEqual(2)
		}
	})

	it('leaves out a group with no match', () => {
		expect(headings('qqqq')).toEqual([])
	})
})

describe('the search of every election', () => {
	if (midterms === undefined) throw new Error('The registry has no 2026 midterms.')

	const upcoming: Election = {
		...midterms,
		year: 2028,
		slug: 'general',
		name: 'General',
		date: '2028-11-07',
		status: 'upcoming',
	}

	const elections = [
		{ election: midterms, races },
		{ election: upcoming, races: [] },
	]

	it('lists only the elections for an empty query, each to its overview', () => {
		const groups = electionsSearchGroups(elections, '')

		expect(groups).toEqual([
			{
				heading: 'Elections',
				rows: [
					expect.objectContaining({ label: '2026 Midterms', href: '/2026/us/midterms' }),
					expect.objectContaining({ label: '2028 General', href: '/2028/us/general' }),
				],
			},
		])
	})

	it('finds an election by its year, its name, or its country', () => {
		const labels = (query: string) =>
			electionsSearchGroups(elections, query)
				.find((group) => group.heading === 'Elections')
				?.rows.map((row) => row.label)

		expect(labels('2028')).toEqual(['2028 General'])

		expect(labels('midterms')).toEqual(['2026 Midterms'])

		expect(labels('united states')).toEqual(['2026 Midterms', '2028 General'])
	})

	it('names the election in the heading of each group of races, and leads to its Drawer', () => {
		const groups = electionsSearchGroups(elections, 'georgia house 6th')

		expect(groups.map((group) => group.heading)).toEqual(['House, 2026 Midterms'])

		expect(groups[0]?.rows[0]).toMatchObject({
			label: 'Georgia 6th District',
			href: '/2026/us/midterms?region=ga&office=house&district=06',
		})
	})

	it('gives the same matches as the search of the election', () => {
		const one = searchGroups(races, 'georgia')

		const every = electionsSearchGroups(elections, 'georgia')

		expect(every.map((group) => group.heading)).toEqual(
			one.map((group) => `${group.heading}, 2026 Midterms`),
		)

		expect(every.map((group) => group.rows.map((row) => row.key))).toEqual(
			one.map((group) => group.rows.map((row) => row.key)),
		)
	})
})
