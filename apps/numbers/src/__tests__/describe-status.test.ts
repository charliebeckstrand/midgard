import { describe, expect, it } from 'vitest'
import { describeStatus } from '../components/game-board/describe-status'
import { createGame, type Game, getStatus, SLOTS } from '../utilities/game'

/** Makes a game of the seed `test` with the numbers of `placed` in their slots, and `drawn` waiting. */
function makeGame(placed: Record<number, number>, drawn: number | null = null): Game {
	const game = createGame('test')

	return { ...game, slots: game.slots.map((_, index) => placed[index] ?? null), drawn, last: drawn }
}

/** Speaks the status of `game`, against `cpu` when it is given. */
function speak(game: Game, cpu: Game | null = null): string {
	return describeStatus(game, getStatus(game), cpu, String)
}

/** A full game: the numbers 1 to 20 in order. */
const full = Object.fromEntries(Array.from({ length: SLOTS }, (_, index) => [index, index + 1]))

describe('describeStatus', () => {
	it('speaks the drawn number while it waits, and nothing before a draw', () => {
		expect(speak(makeGame({}, 500))).toBe('500')
		expect(speak(makeGame({}))).toBe('')
	})

	it('speaks a bust with its score, and a win', () => {
		expect(speak(makeGame({ 0: 300, 1: 310 }, 305))).toBe('305 has no slot. Score 2 of 20')
		expect(speak(makeGame(full))).toBe('All 20 placed')
	})

	it('adds the result against the CPU at the end, with both scores', () => {
		const bust = makeGame({ 0: 300, 1: 310 }, 305)

		expect(speak(bust, makeGame({ 0: 1 }))).toBe('305 has no slot. Score 2 of 20. You win, 2 to 1')
		expect(speak(bust, makeGame({ 0: 1, 1: 2, 2: 3 }))).toBe(
			'305 has no slot. Score 2 of 20. The CPU wins, 2 to 3',
		)
		expect(speak(makeGame(full), makeGame(full))).toBe('All 20 placed. A tie, 20 to 20')
	})

	it('speaks no result while the game of the player goes on', () => {
		expect(speak(makeGame({}, 500), makeGame({ 0: 1 }))).toBe('500')
	})
})
