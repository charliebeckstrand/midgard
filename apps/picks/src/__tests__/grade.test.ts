import { describe, expect, it } from 'vitest'
import {
	formatLine,
	gradePick,
	pickLine,
	pickPoints,
	scoredLine,
	tallyWeek,
} from '../utilities/grade'
import { game, team } from './fixtures'

const final = game({
	id: 'g1',
	state: 'final',
	spread: { favorite: '12', points: 7 },
	away: team({ id: '2', score: 17 }),
	home: team({ id: '12', score: 24, winner: true }),
})

describe('gradePick', () => {
	it('grades a pick of the winner right, whatever the spread', () => {
		expect(gradePick(final, { team: '12', line: -7 })).toBe('right')
	})

	it('grades a pick of the loser wrong', () => {
		expect(gradePick(final, { team: '2', line: 7 })).toBe('wrong')
	})

	it('grades every pick on a tie as a tie', () => {
		const tie = game({
			state: 'final',
			away: team({ id: '2', score: 20 }),
			home: team({ id: '12', score: 20 }),
		})

		expect(gradePick(tie, { team: '12', line: 0 })).toBe('tie')
	})

	it('gives no grade before the game is over', () => {
		expect(gradePick(game({ state: 'live' }), { team: '12', line: 0 })).toBeNull()
	})

	it('gives no grade without a pick', () => {
		expect(gradePick(final, undefined)).toBeNull()
	})
})

describe('pickLine', () => {
	it('signs the line negative for the favorite and positive for the underdog', () => {
		expect(pickLine(final, '12')).toBe(-7)

		expect(pickLine(final, '2')).toBe(7)
	})

	it('is null without a line', () => {
		expect(pickLine(game(), '12')).toBeNull()
	})
})

describe('pickPoints', () => {
	it('gives a favorite and a pick-em 1 point', () => {
		expect(pickPoints(-10)).toBe(1)

		expect(pickPoints(0)).toBe(1)
	})

	it('gives an underdog 1 more point for each 3 points, or part of 3', () => {
		expect(pickPoints(1.5)).toBe(2)

		expect(pickPoints(3)).toBe(2)

		expect(pickPoints(7)).toBe(4)

		expect(pickPoints(10)).toBe(5)
	})
})

describe('formatLine', () => {
	it('reads as a signed line, or PK', () => {
		expect(formatLine(-3.5)).toBe('−3.5')

		expect(formatLine(7)).toBe('+7')

		expect(formatLine(0)).toBe('PK')
	})
})

describe('tallyWeek', () => {
	it('scores the points of the saved line, not the line now', () => {
		const moved = { ...final, spread: { favorite: '12', points: 3 } }

		expect(tallyWeek([moved], { g1: { team: '2', line: 7 } })).toEqual({
			right: 0,
			wrong: 1,
			tie: 0,
			points: 0,
			possible: 4,
		})
	})

	it('scores a pick saved before the line posted on the closing line', () => {
		expect(tallyWeek([final], { g1: { team: '12', line: null } })).toMatchObject({
			right: 1,
			points: 1,
		})
	})

	it("scores a game that never had a line as a pick'em", () => {
		const lineless = { ...final, spread: null }

		expect(tallyWeek([lineless], { g1: { team: '12', line: null } })).toMatchObject({
			points: 1,
			possible: 1,
		})
	})
})

describe('scoredLine', () => {
	it('takes the saved line of a pick', () => {
		expect(scoredLine(final, { team: '2', line: 9 })).toBe(9)
	})

	it('takes the line of the game for a pick saved before the line posted', () => {
		expect(scoredLine(final, { team: '2', line: null })).toBe(7)
	})

	it('is null while no line is known', () => {
		expect(scoredLine(game(), { team: '2', line: null })).toBeNull()
	})
})
