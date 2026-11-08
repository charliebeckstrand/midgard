import { describe, expect, it } from 'vitest'
import { ELECTIONS, findContest, findElection } from '../elections/registry'
import { stateOfKey, US_STATES } from '../elections/us-states'
import {
	districtKey,
	districtName,
	districtOfKey,
	parseRacePath,
	racePath,
} from '../utilities/elections-url'

const midterms = findElection('2026', 'us', 'midterms')

if (midterms === undefined) throw new Error('The registry has no 2026 midterms.')

const senate = findContest(midterms, 'senate')

const house = findContest(midterms, 'house')

const georgia = stateOfKey('ga')

describe('the registry', () => {
	it('gives no office a slug that is also the key of a region', () => {
		for (const election of ELECTIONS) {
			for (const contest of election.contests) {
				expect(US_STATES.some((state) => state.key === contest.slug)).toBe(false)
			}
		}
	})

	it('finds an election by its year, country, and slug', () => {
		expect(findElection('2026', 'us', 'primaries')).toBeUndefined()
	})
})

describe('parseRacePath', () => {
	it('reads each page of an election', () => {
		expect(parseRacePath(midterms, [])).toEqual({ region: null, contest: null, district: null })

		expect(parseRacePath(midterms, ['senate'])).toEqual({
			region: null,
			contest: senate,
			district: null,
		})

		expect(parseRacePath(midterms, ['ga'])).toEqual({
			region: georgia,
			contest: null,
			district: null,
		})

		expect(parseRacePath(midterms, ['ga', 'house'])).toEqual({
			region: georgia,
			contest: house,
			district: null,
		})

		expect(parseRacePath(midterms, ['ga', 'house', '06'])).toEqual({
			region: georgia,
			contest: house,
			district: '06',
		})

		expect(parseRacePath(midterms, ['ak', 'house', 'al'])?.district).toBe('al')
	})

	it('names no page for a path that the election does not hold', () => {
		for (const segments of [
			['xx'],
			['senate', 'ga'],
			['ga', 'mayor'],
			['ga', 'senate', '06'],
			['ga', 'house', '6'],
			['ga', 'house', '06', 'x'],
		]) {
			expect(parseRacePath(midterms, segments)).toBeNull()
		}
	})
})

describe('racePath', () => {
	it('writes the path of a location, and the reverse of parseRacePath', () => {
		expect(racePath(midterms, {})).toBe('/2026/us/midterms')

		expect(racePath(midterms, { contest: senate })).toBe('/2026/us/midterms/senate')

		expect(racePath(midterms, { region: georgia, contest: house, district: '06' })).toBe(
			'/2026/us/midterms/ga/house/06',
		)

		// A district with no region is not a page, so the path leaves it out.
		expect(racePath(midterms, { contest: house, district: '06' })).toBe('/2026/us/midterms/house')
	})
})

describe('districts', () => {
	it('reads and writes the civicAPI key of a district', () => {
		expect(districtKey('ga', '06')).toBe('ga-06')

		expect(districtOfKey('ga-06')).toBe('06')

		expect(districtOfKey('ak-al')).toBe('al')

		expect(districtOfKey('ga')).toBeNull()
	})

	it('names a district with its ordinal', () => {
		expect(districtName('01')).toBe('1st District')

		expect(districtName('02')).toBe('2nd District')

		expect(districtName('03')).toBe('3rd District')

		expect(districtName('11')).toBe('11th District')

		expect(districtName('22')).toBe('22nd District')

		expect(districtName('al')).toBe('At-large District')
	})
})
