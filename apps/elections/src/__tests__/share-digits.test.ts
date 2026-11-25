// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { createElement as h } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

const election = findElection('2026', 'us', 'midterms')

const contest = election && findContest(election, 'senate')

if (contest === undefined) throw new Error('The registry has no 2026 Senate.')

const [race] = readEntries(contest, readNationalRace(87528, senate))

if (race === undefined) throw new Error('The fixture has no race.')

// The Minnesota 1st District: one decimal shows the leader at 50.0% and the runner-up at 49.9%.
const votes: [name: string, party: string, slot: Candidate['slot'], votes: number][] = [
	['Jake Johnson', 'Democratic', 'blue', 163_065],
	['Brad Finstad', 'Republican', 'red', 162_741],
	['Write-in', 'Nonpartisan', 'zinc', 391],
]

const total = votes.reduce((sum, [, , , count]) => sum + count, 0)

const candidates: Candidate[] = votes.map(([name, party, slot, count]) => ({
	name,
	party,
	slot,
	votes: count,
	percent: (count / total) * 100,
	winner: false,
	incumbent: false,
}))

const entry: RaceEntry = { ...race, candidates, called: false, reporting: 99.9 }

// A race card and its summary in the Drawer show the same share of each candidate.
describe('share digits', () => {
	it('shows the shares to two decimals on the race card', () => {
		const view = render(h(RaceCard, { entry, onPick: () => {} }))

		expect(view.container).toHaveTextContent('49.99%')
		expect(view.container).toHaveTextContent('49.89%')
	})

	it('shows the shares to two decimals in the race summary', () => {
		const view = render(
			h(RaceSummary, { candidates, reporting: 99.9, called: false, detail: true }),
		)

		expect(view.container).toHaveTextContent('49.99%')
		expect(view.container).toHaveTextContent('49.89%')
	})
})
