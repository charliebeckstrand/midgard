import { describe, expect, it } from 'vitest'
import { hasKickedOff, isLocked, isWeekClosed, mergePicks } from '../utilities/locks'
import { makeGame, makeTeam } from './fixtures'

const KICKOFF = Date.parse('2026-09-10T00:20Z')

const before = KICKOFF - 1

const after = KICKOFF + 1

const open = makeGame({ id: 'g1', kickoff: '2026-09-10T00:20Z' })

const later = makeGame({ id: 'g2', kickoff: '2026-09-14T17:00Z' })

describe('isLocked', () => {
	it('locks a game at its kickoff, whatever the cached state says', () => {
		expect(isLocked(open, before)).toBe(false)

		expect(isLocked(open, KICKOFF)).toBe(true)
	})

	it('locks a game that is in play', () => {
		expect(isLocked(makeGame({ state: 'live', kickoff: '2099-01-01T00:00Z' }), before)).toBe(true)
	})
})

describe('hasKickedOff', () => {
	it('holds from the first kickoff of the week', () => {
		expect(hasKickedOff([open, later], before)).toBe(false)

		expect(hasKickedOff([open, later], after)).toBe(true)
	})
})

describe('isWeekClosed', () => {
	it('holds once every game of the week is locked', () => {
		expect(isWeekClosed([open, later], after)).toBe(false)

		expect(isWeekClosed([open, later], Date.parse(later.kickoff))).toBe(true)
	})
})

describe('mergePicks', () => {
	const home = open.home.id

	const away = open.away.id

	it('keeps the stored pick of a locked game and takes the submitted pick of an open one', () => {
		const stored = { g1: { team: home, line: 0 } }

		const result = mergePicks([open, later], stored, { g1: away, g2: later.away.id }, after)

		expect(result).toEqual({
			picks: { g1: { team: home, line: 0 }, g2: { team: later.away.id, line: null } },
		})
	})

	it('keeps the saved line of an open pick whose team did not change', () => {
		const moved = makeGame({ id: 'g1', spread: { favorite: home, points: 3 } })

		const stored = { g1: { team: away, line: 7 } }

		expect(mergePicks([moved], stored, { g1: away }, before)).toEqual({
			picks: { g1: { team: away, line: 7 } },
		})
	})

	it('saves a pick without a line while the line is pending', () => {
		expect(mergePicks([open], {}, { g1: away }, before)).toEqual({
			picks: { g1: { team: away, line: null } },
		})
	})

	it('saves the line of the picked team now', () => {
		const lined = makeGame({ id: 'g1', spread: { favorite: home, points: 3.5 } })

		expect(mergePicks([lined], {}, { g1: away }, before)).toEqual({
			picks: { g1: { team: away, line: 3.5 } },
		})
	})

	it('drops the pick of an open game the submission leaves out', () => {
		expect(mergePicks([open], { g1: { team: home, line: 0 } }, {}, before)).toEqual({ picks: {} })
	})

	it('refuses a game that is not in the week', () => {
		expect(mergePicks([open], {}, { g9: home }, before)).toEqual({
			error: 'No game g9 in this week.',
		})
	})

	it('refuses a team that does not play in the game', () => {
		const other = makeTeam({ id: '99' })

		expect(mergePicks([open], {}, { g1: other.id }, before)).toEqual({
			error: 'Team 99 does not play in game g1.',
		})
	})
})
