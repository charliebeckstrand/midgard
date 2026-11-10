import { describe, expect, it } from 'vitest'
import type { Candidate } from '../types'
import { delegation, initials, isCalled, lead, marginLabel, surname } from '../utilities/race-math'

function candidate(party: string, percent: number, winner = false): Candidate {
	const slot = party === 'Democratic' ? 'blue' : party === 'Republican' ? 'red' : 'amber'

	return { name: party, party, slot, votes: percent * 100, percent, winner, incumbent: false }
}

const dLead = [candidate('Democratic', 55.2), candidate('Republican', 42.8)]

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

	it('labels a margin with the letter of the leading party', () => {
		expect(marginLabel(dLead)).toBe('D+12.4')

		expect(marginLabel(iLead)).toBe('I+2.5')

		expect(marginLabel(unopposed)).toBe('Unopposed')
	})

	it('counts the called seats of a delegation by party, and the leaders of the seats not called', () => {
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
			leads: [{ party: 'Democratic', slot: 'blue', seats: 1 }],
			called: 3,
			total: 4,
		})
	})

	it('reads the initials and the surname of a name past its suffix and its nickname', () => {
		expect(initials('Jon Ossoff')).toBe('JO')
		expect(initials('Nick Begich III')).toBe('NB')
		expect(initials('Thomas Kean Jr.')).toBe('TK')
		expect(initials('Henry J. Ward, III')).toBe('HW')
		expect(initials('James C. "Jim" McDermott')).toBe('JM')
		expect(initials('Ángel Pérez')).toBe('ÁP')

		expect(surname('Nick Begich III')).toBe('Begich')
		expect(surname('Stewart Cathey, Jr.')).toBe('Cathey')
		expect(surname('Prescription Dope Deaths Johnson, Jr')).toBe('Johnson')
	})
})
