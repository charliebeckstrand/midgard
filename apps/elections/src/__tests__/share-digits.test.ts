// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RaceCard } from '../components/race-card'
import { RaceSummary } from '../components/race-summary'
import { findContest, findElection } from '../elections/registry'
import { readNationalRace } from '../server/civic-race'
import type { Candidate } from '../types'
import { type RaceEntry, readEntries } from '../utilities/results'
import senate from './fixtures/senate.json'

vi.mock('next/navigation', () => ({
	usePathname: () => '/2026/us/midterms',
	useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

const election = findElection('2026', 'us', 'midterms')

const contest = election && findContest(election, 'senate')

if (contest === undefined) throw new Error('The registry has no 2026 Senate.')

const [race] = readEntries(contest, readNationalRace(87528, senate))

if (race === undefined) throw new Error('The fixture has no race.')

/** A candidate with a share of a total of votes. */
function candidate(name: string, party: string, slot: Candidate['slot'], votes: number) {
	const total = 163_065 + 162_741 + 391

	return {
		name,
		party,
		slot,
		votes,
		percent: (votes / total) * 100,
		winner: false,
		incumbent: false,
	}
}

// The Minnesota 1st District: one decimal shows the leader at 50.0% and the runner-up at 49.9%.
const candidates: Candidate[] = [
	candidate('Jake Johnson', 'Democratic', 'blue', 163_065),
	candidate('Brad Finstad', 'Republican', 'red', 162_741),
	candidate('Write-in', 'Nonpartisan', 'zinc', 391),
]

const entry: RaceEntry = { ...race, candidates, called: false, reporting: 99.9 }

// A race card and its summary in the Drawer show the same share of each candidate.
describe('share digits', () => {
	it('shows the same shares on the race card and in the race summary', () => {
		const card = render(h(RaceCard, { entry, onPick: () => {} }))

		expect(card.queryAllByText('49.99%')).not.toHaveLength(0)
		expect(card.queryAllByText('49.89%')).not.toHaveLength(0)

		cleanup()

		const summary = render(
			h(RaceSummary, { candidates, reporting: 99.9, called: false, detail: true }),
		)

		expect(summary.queryAllByText('49.99%')).not.toHaveLength(0)
		expect(summary.queryAllByText('49.89%')).not.toHaveLength(0)
	})
})
