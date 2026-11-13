import { describe, expect, it, vi } from 'vitest'
import { findContest, findElection } from '../elections/registry'
import { readNationalRace, readRace } from '../server/civic-race'
import { atlasCountyNames } from '../server/county-names'
import { race } from '../server/races'
import { latestCalls } from '../server/results'
import { readEntries } from '../utilities/results'
import gaSenate from './fixtures/ga-senate.json'
import senate from './fixtures/senate.json'

vi.mock('../server/races', () => ({ race: vi.fn(), nationalRace: vi.fn() }))

const midterms = findElection('2026', 'us', 'midterms')

const contest = midterms && findContest(midterms, 'senate')

if (contest === undefined) throw new Error('The registry has no 2026 Senate.')

const entries = readEntries(contest, readNationalRace(87528, senate))

const result = { contest, national: readNationalRace(87528, senate), entries }

/** A called race with a winner, as `race/{id}` gives it. */
const called = readRace(87087, gaSenate, '13', atlasCountyNames)

describe('latestCalls', () => {
	it('leaves out a called race that gives no call time, because its last update is not when it was called', async () => {
		const delaware = entries.find((entry) => entry.state.key === 'de')

		if (delaware === undefined || !delaware.called) {
			throw new Error('The fixture has no called Delaware race.')
		}

		vi.mocked(race).mockImplementation(async (id) =>
			id === delaware.raceId
				? { ...called, id, calledAt: null, updated: '2026-11-09T05:00:00.000Z' }
				: {
						...called,
						id,
						calledAt: { at: '2026-11-05T02:00:00.000Z', text: 'Nov 4, 2026, 9:00 PM EST' },
					},
		)

		const calls = await latestCalls([result], 5)

		expect(calls).toHaveLength(5)

		expect(calls.map((call) => call.entry.raceId)).not.toContain(delaware.raceId)

		expect(calls.every((call) => call.at === '2026-11-05T02:00:00.000Z')).toBe(true)
	})
})
