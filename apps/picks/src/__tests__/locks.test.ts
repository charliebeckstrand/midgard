import { describe, expect, it } from 'vitest'
import { isLocked, kickedOff, mergePicks } from '../utilities/locks'
import { game, team } from './fixtures'

const KICKOFF = Date.parse('2026-09-10T00:20Z')

const before = KICKOFF - 1

const after = KICKOFF + 1

const open = game({ id: 'g1', kickoff: '2026-09-10T00:20Z' })

const later = game({ id: 'g2', kickoff: '2026-09-14T17:00Z' })

describe('isLocked', () => {
	it('locks a game at its kickoff, whatever the cached state says', () => {
		expect(isLocked(open, before)).toBe(false)

		expect(isLocked(open, KICKOFF)).toBe(true)
	})

	it('locks a game that is in play', () => {
		expect(isLocked(game({ state: 'live', kickoff: '2099-01-01T00:00Z' }), before)).toBe(true)
	})
})

describe('kickedOff', () => {
	it('holds from the first kickoff of the week', () => {
		expect(kickedOff([open, later], before)).toBe(false)

		expect(kickedOff([open, later], after)).toBe(true)
	})
})

describe('mergePicks', () => {
	const home = open.home.id

	const away = open.away.id

	it('keeps the stored pick of a locked game and takes the submitted pick of an open one', () => {
		const result = mergePicks([open, later], { g1: home }, { g1: away, g2: later.away.id }, after)

		expect(result).toEqual({ picks: { g1: home, g2: later.away.id } })
	})

	it('drops the pick of an open game the submission leaves out', () => {
		expect(mergePicks([open], { g1: home }, {}, before)).toEqual({ picks: {} })
	})

	it('refuses a game that is not in the week', () => {
		expect(mergePicks([open], {}, { g9: home }, before)).toEqual({
			error: 'No game g9 in this week.',
		})
	})

	it('refuses a team that does not play in the game', () => {
		const other = team({ id: '99' })

		expect(mergePicks([open], {}, { g1: other.id }, before)).toEqual({
			error: 'Team 99 does not play in game g1.',
		})
	})
})
