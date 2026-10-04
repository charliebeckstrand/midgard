import { describe, expect, it } from 'vitest'
import { gradePick } from '../utilities/grade'
import { game, team } from './fixtures'

const final = game({
	state: 'final',
	away: team({ id: '2', score: 17 }),
	home: team({ id: '12', score: 24, winner: true }),
})

describe('gradePick', () => {
	it('grades a pick of the winner right', () => {
		expect(gradePick(final, '12')).toBe('right')
	})

	it('grades a pick of the loser wrong', () => {
		expect(gradePick(final, '2')).toBe('wrong')
	})

	it('grades every pick on a tie wrong', () => {
		const tie = game({ state: 'final', away: team({ id: '2' }), home: team({ id: '12' }) })

		expect(gradePick(tie, '12')).toBe('wrong')
	})

	it('gives no grade before the game is over', () => {
		expect(gradePick(game({ state: 'live' }), '12')).toBeNull()
	})

	it('gives no grade without a pick', () => {
		expect(gradePick(final, undefined)).toBeNull()
	})
})
