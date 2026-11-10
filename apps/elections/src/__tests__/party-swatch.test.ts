// @vitest-environment jsdom
import { cleanup, render, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LatestCalls } from '../components/latest-calls'
import { RaceCard } from '../components/race-card'
import { RaceSummary } from '../components/race-summary'
import { findContest, findElection } from '../elections/registry'
import { readNationalRace } from '../server/civic-race'
import { readEntries } from '../utilities/results'
import senate from './fixtures/senate.json'

vi.mock('next/navigation', () => ({
	usePathname: () => '/2026/us/midterms',
	useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

const election = findElection('2026', 'us', 'midterms')

const contest = election && findContest(election, 'senate')

if (election === undefined || contest === undefined) {
	throw new Error('The registry has no 2026 Senate.')
}

const entries = readEntries(contest, readNationalRace(87528, senate))

const entry = entries.find((candidate) => candidate.called && candidate.candidates.length >= 2)

if (entry === undefined) throw new Error('The fixture has no called race of two candidates.')

const [winner, runnerUp] = entry.candidates

if (winner === undefined || runnerUp === undefined)
	throw new Error('The race has no two candidates.')

// The color of a swatch is the party, so a screen reader hears the party by name.
describe('party swatch', () => {
	it('names the party of each leader of a race card', () => {
		const view = render(h(RaceCard, { entry, onPick: () => {} }))

		expect(view.getByRole('img', { name: winner.party })).toBeTruthy()
		expect(view.getByRole('img', { name: runnerUp.party })).toBeTruthy()
	})

	it('names the party of each candidate of a race summary', () => {
		const view = render(
			h(RaceSummary, { candidates: entry.candidates, reporting: 100, called: true }),
		)

		expect(view.getByRole('img', { name: winner.party })).toBeTruthy()
	})

	it('names the party of the winner of a latest call', () => {
		const view = render(
			h(LatestCalls, { election, calls: [{ entry, winner, at: '2026-11-05T02:00:00.000Z' }] }),
		)

		const list = view.getByRole('list', { name: 'Latest calls' })

		expect(within(list).getByRole('img', { name: winner.party })).toBeTruthy()
	})
})
