import { describe, expect, it } from 'vitest'
import {
	CivicShapeError,
	foldName,
	NO_PARTY,
	partySlot,
	readNationalRace,
	readRace,
} from '../server/civic-race'
import { atlasCountyNames } from '../server/county-names'
import akSenate from './fixtures/ak-senate.json'
import ctGovernor from './fixtures/ct-governor.json'
import ga06 from './fixtures/ga-06.json'
import gaSenate from './fixtures/ga-senate.json'
import house from './fixtures/house.json'
import mnSenate from './fixtures/mn-senate.json'
import senate from './fixtures/senate.json'

describe('readRace', () => {
	it('reads a race, its candidates most votes first, and its counties by FIPS', () => {
		const race = readRace(87087, gaSenate, '13', atlasCountyNames)

		expect(race).toMatchObject({
			id: 87087,
			name: 'Georgia US Senate',
			region: 'ga',
			special: false,
		})

		expect(
			race.candidates.map((candidate) => [candidate.name, candidate.slot, candidate.winner]),
		).toEqual([
			['Jon Ossoff', 'blue', true],
			['Mike Collins', 'red', false],
		])

		expect(race.counties).toHaveLength(Object.keys(gaSenate.region_results).length)

		expect(race.counties.every((county) => /^13\d{3}$/.test(county.fips))).toBe(true)

		expect(race.counties.find((county) => county.name === 'Fulton')?.fips).toBe('13121')
	})

	it('reads the counties inside a House district', () => {
		const race = readRace(87078, ga06, '13', atlasCountyNames)

		expect(race.counties.length).toBeGreaterThan(0)

		expect(race.counties.every((county) => county.fips.startsWith('13'))).toBe(true)
	})

	it('joins a county with no FIPS code to the atlas county of the same name', () => {
		const race = readRace(87229, mnSenate, '27', atlasCountyNames)

		const codes = new Map(race.counties.map((county) => [county.name, county.fips]))

		expect(codes.get('Lac Qui Parle')).toBe('27073')

		expect(codes.get('Lake Of The Woods')).toBe('27077')

		expect(codes.get('Mcleod')).toBe('27085')
	})

	it('adds the two new Alaska areas into the Valdez-Cordova county of the atlas, and leaves out the state house districts', () => {
		const race = readRace(86916, akSenate, '02', atlasCountyNames)

		const fips = race.counties.map((county) => county.fips)

		expect(fips).toContain('02261')

		expect(fips).not.toContain('02063')

		expect(fips).not.toContain('02066')

		const regions = Object.values(
			akSenate.region_results as Record<string, { fips?: string; candidates: { votes: number }[] }>,
		)

		const parts = regions
			.filter((region) => region.fips === '02063' || region.fips === '02066')
			.flatMap((region) => region.candidates.map((candidate) => candidate.votes))

		expect(parts.length).toBeGreaterThan(0)

		const merged = race.counties.find((county) => county.fips === '02261')

		expect(merged?.candidates.reduce((sum, candidate) => sum + candidate.votes, 0)).toBe(
			parts.reduce((sum, votes) => sum + votes, 0),
		)

		// Every county of the race is a borough or a census area with a code.
		expect(race.counties.every((county) => /^02\d{3}$/.test(county.fips))).toBe(true)
	})

	it('uses the county rows of Connecticut and leaves out its towns and planning regions', () => {
		const race = readRace(87026, ctGovernor, '09', atlasCountyNames)

		expect(race.counties.map((county) => county.fips).sort()).toEqual([
			'09001',
			'09003',
			'09005',
			'09007',
			'09009',
			'09011',
			'09013',
			'09015',
		])
	})

	it('marks a special election by its name', () => {
		const race = readRace(
			1,
			{ ...ga06, election_name: 'Ohio US Senate Special General' },
			'13',
			atlasCountyNames,
		)

		expect(race.special).toBe(true)
	})

	it('reads a ballot choice with an empty party, such as None of These Candidates in Nevada, as no party', () => {
		const choice = { ...ga06.candidates[0], name: 'None of These Candidates', party: '', votes: 1 }

		const race = readRace(
			87078,
			{ ...ga06, candidates: [...ga06.candidates, choice] },
			'13',
			atlasCountyNames,
		)

		expect(race.candidates.at(-1)).toMatchObject({ party: NO_PARTY, slot: 'amber' })

		expect(() =>
			readRace(
				87078,
				{ ...ga06, candidates: [{ ...choice, party: null }] },
				'13',
				atlasCountyNames,
			),
		).toThrow(CivicShapeError)
	})

	it('fails closed on a candidate with no votes', () => {
		const broken = {
			...ga06,
			candidates: [{ ...ga06.candidates[0], votes: undefined }],
		}

		expect(() => readRace(87078, broken, '13', atlasCountyNames)).toThrow(CivicShapeError)
	})

	it('fails closed on a county with no code whose name the atlas does not have', () => {
		const broken = {
			...ga06,
			region_results: {
				nowhere: {
					name: 'Nowhere',
					type: 'County',
					percent_reporting: 100,
					candidates: ga06.candidates,
				},
			},
		}

		expect(() => readRace(87078, broken, '13', atlasCountyNames)).toThrow(/names no county/)
	})
})

describe('readNationalRace', () => {
	it('reads the seats of each party and the race of each state', () => {
		const race = readNationalRace(87528, senate)

		expect(race.parties.map((party) => [party.party, party.slot, party.seats])).toEqual([
			['Democratic', 'blue', 54],
			['Republican', 'red', 44],
		])

		expect(race.regions).toHaveLength(35)

		expect(race.regions.find((region) => region.key === 'ga')?.raceId).toBe(87087)
	})

	it('reads the race of each district, keyed by state and district', () => {
		const race = readNationalRace(87524, house)

		expect(race.regions.find((region) => region.key === 'ga-06')?.raceId).toBe(87078)

		expect(race.regions.every((region) => /^[a-z]{2}-(\d{2}|al)$/.test(region.key))).toBe(true)
	})

	it('reads the runner-up of any party, so Nebraska reads its independent second', () => {
		const nebraska = readNationalRace(87528, senate).regions.find((region) => region.key === 'ne')

		expect(
			nebraska?.candidates.slice(0, 2).map((candidate) => [candidate.name, candidate.slot]),
		).toEqual([
			['Pete Ricketts', 'red'],
			['Dan Osborn', 'amber'],
		])
	})
})

describe('the party colors and the names', () => {
	it('colors Democratic blue, Republican red, and every other party amber', () => {
		expect(['Democratic', 'Republican', 'Independent', 'Libertarian'].map(partySlot)).toEqual([
			'blue',
			'red',
			'amber',
			'amber',
		])
	})

	it('folds a name to lowercase with single spaces', () => {
		expect(foldName(' Lac  Qui Parle ')).toBe('lac qui parle')
	})
})
