import { describe, expect, it } from 'vitest'
import { ELECTIONS, findContest, findElection } from '../elections/registry'
import { stateOfKey, US_STATES } from '../elections/us-states'
import {
	districtName,
	districtOfKey,
	drawerHref,
	officePath,
	readDrawerStep,
} from '../utilities/elections-url'

const found = findElection('2026', 'us', 'midterms')

if (found === undefined) throw new Error('The registry has no 2026 midterms.')

const midterms = found

const senate = findContest(midterms, 'senate')

const georgia = stateOfKey('ga')

if (georgia === undefined) throw new Error('The states have no Georgia.')

/** The step of the Drawer of a query string. */
function read(query: string) {
	return readDrawerStep(midterms, new URLSearchParams(query))
}

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

describe('the step of the Drawer', () => {
	it('reads each step from the address', () => {
		expect(read('')).toBeNull()

		expect(read('region=ga')).toEqual({
			region: georgia,
			office: null,
			district: null,
			county: null,
		})

		expect(read('region=ga&office=senate&county=13121')).toEqual({
			region: georgia,
			office: 'senate',
			district: null,
			county: '13121',
		})

		expect(read('region=ga&office=house&district=06&county=13121')).toEqual({
			region: georgia,
			office: 'house',
			district: '06',
			county: '13121',
		})

		expect(read('region=ak&office=house&district=al')?.district).toBe('al')
	})

	it('drops a param that names nothing, with each param under it', () => {
		expect(read('region=xx&office=senate')).toBeNull()

		expect(read('region=ga&office=mayor&county=13121')?.office).toBeNull()

		expect(read('region=ga&office=senate&district=06')?.district).toBeNull()

		// A county of the House needs its district.
		expect(read('region=ga&office=house&county=13121')?.county).toBeNull()

		expect(read('region=ga&office=house&district=6')?.district).toBeNull()

		expect(read('region=ga&office=senate&county=131')?.county).toBeNull()
	})

	it('writes the address of a step, and the reverse of readDrawerStep', () => {
		const path = officePath(midterms, senate ?? null)

		expect(officePath(midterms, null)).toBe('/2026/us/midterms')

		expect(path).toBe('/2026/us/midterms/senate')

		expect(drawerHref(path, null)).toBe(path)

		// The overview of a state is the state alone.
		expect(drawerHref(path, { region: georgia, office: null, district: null, county: null })).toBe(
			`${path}?region=ga`,
		)

		const href = drawerHref(path, {
			region: georgia,
			office: 'house',
			district: '06',
			county: null,
		})

		expect(href).toBe('/2026/us/midterms/senate?region=ga&office=house&district=06')

		expect(read(href.split('?')[1] ?? '')).toEqual({
			region: georgia,
			office: 'house',
			district: '06',
			county: null,
		})
	})
})

describe('districts', () => {
	it('reads the district of a civicAPI key', () => {
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
