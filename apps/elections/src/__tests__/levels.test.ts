import { describe, expect, it } from 'vitest'
import { type Election, findElection } from '../elections/registry'
import {
	activeFilters,
	filterElections,
	isoDay,
	levelFilterOptions,
	localDay,
	NO_FILTER,
	openingDay,
	statusGroups,
} from '../utilities/levels'

const midterms = findElection('2026', 'us', 'midterms')

if (midterms === undefined) throw new Error('The registry has no 2026 midterms.')

const election = (patch: Partial<Election>): Election => ({ ...midterms, ...patch })

const general2028 = election({
	year: 2028,
	slug: 'general',
	name: 'General',
	date: '2028-11-07',
	status: 'upcoming',
	contests: [],
})

const locals = election({
	country: 'gb',
	countryName: 'United Kingdom',
	slug: 'locals',
	name: 'Locals',
	date: '2026-11-26',
	status: 'upcoming',
	contests: [],
})

const general2024 = election({
	year: 2024,
	slug: 'general',
	name: 'General',
	date: '2024-11-05',
	status: 'past',
})

const general2020 = election({ ...general2024, year: 2020, date: '2020-11-03' })

const all = [general2020, general2028, midterms, general2024, locals]

describe('the level pages', () => {
	it('groups the elections: counted now, then the nearest to come, then the newest past', () => {
		expect(
			statusGroups(all).map((group) => [group.heading, group.elections.map((entry) => entry.date)]),
		).toEqual([
			['Counting', ['2026-11-03']],
			['Upcoming', ['2026-11-26', '2028-11-07']],
			['Past', ['2024-11-05', '2020-11-03']],
		])

		expect(statusGroups([locals]).map((group) => group.heading)).toEqual(['Upcoming'])
	})

	it('gives the year and the country filter their distinct options, so a filter of one option can hide', () => {
		const options = levelFilterOptions(all)

		expect(options.year.map((option) => option.value)).toEqual(['2020', '2028', '2026', '2024'])

		expect(options.country).toEqual([
			{ value: 'us', label: 'United States' },
			{ value: 'gb', label: 'United Kingdom' },
		])

		expect(levelFilterOptions([midterms]).country).toHaveLength(1)
	})

	it('lets through only the elections that match each set field', () => {
		expect(filterElections(all, NO_FILTER)).toHaveLength(all.length)

		expect(filterElections(all, { year: null, country: 'gb' })).toEqual([locals])

		expect(filterElections(all, { year: '2026', country: 'us' })).toEqual([midterms])

		expect(filterElections(all, { year: '2028', country: 'gb' })).toEqual([])

		expect(activeFilters({ year: '2026', country: null })).toBe(1)
	})

	it('opens the calendar on the first election of the list', () => {
		expect(openingDay(all)).toBe('2026-11-03')

		expect(openingDay([general2024, general2020])).toBe('2024-11-05')

		expect(openingDay([])).toBeNull()
	})

	it('reads a day of the calendar as its ISO date, and back', () => {
		expect(isoDay(localDay('2026-11-03'))).toBe('2026-11-03')

		expect(localDay('2026-01-09').getDate()).toBe(9)
	})
})
