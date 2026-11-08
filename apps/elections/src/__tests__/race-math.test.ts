import { describe, expect, it } from 'vitest'
import type { Candidate } from '../types'
import {
	delegation,
	isCalled,
	lead,
	marginLabel,
	shareLabel,
	signedLabel,
	signedMargin,
	signedShare,
} from '../utilities/race-math'

function candidate(party: string, percent: number, winner = false): Candidate {
	const slot = party === 'Democratic' ? 'blue' : party === 'Republican' ? 'red' : 'amber'

	return { name: party, party, slot, votes: percent * 100, percent, winner, incumbent: false }
}

const dLead = [candidate('Democratic', 55.2), candidate('Republican', 42.8)]

const rLead = [candidate('Republican', 51), candidate('Democratic', 47)]

const iLead = [candidate('Independent', 50.5), candidate('Republican', 48)]

const unopposed = [candidate('Democratic', 100, true)]

describe('race math', () => {
	it('reads a call from the winner of a candidate', () => {
		expect(isCalled(dLead)).toBe(false)

		expect(isCalled(unopposed)).toBe(true)
	})

	it('gives the lead in points, and no lead to an unopposed race', () => {
		expect(lead(dLead)).toBeCloseTo(12.4)

		expect(lead(unopposed)).toBeNull()
	})

	it('signs the margin of a two-party map: Democratic negative, Republican positive', () => {
		expect(signedMargin(dLead)).toBeCloseTo(-12.4)

		expect(signedMargin(rLead)).toBe(4)

		expect(signedMargin(iLead)).toBeNull()

		expect(signedMargin(unopposed)).toBeNull()
	})

	it('labels a margin with the letter of the leading party', () => {
		expect(marginLabel(dLead)).toBe('D+12.4')

		expect(marginLabel(iLead)).toBe('I+2.5')

		expect(marginLabel(unopposed)).toBe('Unopposed')

		expect(signedLabel(-12.4)).toBe('D+12.4')

		expect(signedLabel(8)).toBe('R+8')

		expect(signedLabel(35)).toBe('R+35')

		expect(signedLabel(0.04)).toBe('Even')

		expect(signedLabel(0)).toBe('Even')
	})

	it('labels a seat share as the share of the party that holds more seats', () => {
		expect(shareLabel(-50)).toBe('100% D')

		expect(shareLabel(10)).toBe('60% R')

		expect(shareLabel(0)).toBe('Even')
	})

	it('counts the called seats of a delegation by party, and leaves out the seats not called', () => {
		const state = delegation([
			[candidate('Republican', 60, true), candidate('Democratic', 40)],
			[candidate('Republican', 55, true), candidate('Democratic', 45)],
			[candidate('Democratic', 70, true), candidate('Republican', 30)],
			[candidate('Democratic', 50), candidate('Republican', 49)],
		])

		expect(state).toEqual({
			parties: [
				{ party: 'Republican', slot: 'red', seats: 2 },
				{ party: 'Democratic', slot: 'blue', seats: 1 },
			],
			called: 3,
			total: 4,
		})

		expect(signedShare(state)).toBeCloseTo(50 / 3)
	})

	it('gives no seat share to a delegation with no called seat', () => {
		expect(signedShare(delegation([dLead]))).toBeNull()
	})
})
