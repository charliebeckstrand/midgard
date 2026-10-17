// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { indexBoard } from '../../modules/kanban/engine/kanban-board'
import {
	isNavigationKey,
	liftedStep,
	neighborCard,
} from '../../modules/kanban/engine/kanban-navigation'

type Card = { id: string }

const board = indexBoard(
	[
		{ id: 'a', items: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] },
		{ id: 'b', items: [] },
		{ id: 'c', items: [{ id: 'c1' }] },
	],
	(card: Card) => card.id,
)

describe('neighborCard', () => {
	it.each([
		['the card after it on ArrowDown', 'a1', 'ArrowDown', 'a2'],
		['the card before it on ArrowUp', 'a2', 'ArrowUp', 'a1'],
		['the first card of the column on Home', 'a3', 'Home', 'a1'],
		['the last card of the column on End', 'a1', 'End', 'a3'],
		['the next column with cards on ArrowRight', 'a1', 'ArrowRight', 'c1'],
		['the last row of a shorter column', 'a3', 'ArrowRight', 'c1'],
		['the same row of a longer column on ArrowLeft', 'c1', 'ArrowLeft', 'a1'],
	] as const)('goes to %s', (_name, from, key, expected) => {
		expect(neighborCard(board, from, key)).toBe(expected)
	})

	it.each([
		['before the first card', 'a1', 'ArrowUp'],
		['after the last card', 'a3', 'ArrowDown'],
		['before the first column', 'a1', 'ArrowLeft'],
		['after the last column', 'c1', 'ArrowRight'],
	] as const)('gives null %s', (_name, from, key) => {
		expect(neighborCard(board, from, key)).toBeNull()
	})

	it('gives null for a card that is not on the board', () => {
		expect(neighborCard(board, 'missing', 'ArrowDown')).toBeNull()
	})
})

describe('the keys of the board', () => {
	it('reads the arrows, Home, and End as navigation keys', () => {
		expect(['ArrowUp', 'Home', 'End', 'Tab'].map(isNavigationKey)).toEqual([
			true,
			true,
			true,
			false,
		])
	})

	it('steps a lifted card in the column on Up and Down', () => {
		expect(liftedStep('ArrowUp')).toEqual({ across: false, direction: -1 })

		expect(liftedStep('ArrowDown')).toEqual({ across: false, direction: 1 })
	})

	it('steps a lifted card across the board on Left and Right', () => {
		expect(liftedStep('ArrowLeft')).toEqual({ across: true, direction: -1 })

		expect(liftedStep('ArrowRight')).toEqual({ across: true, direction: 1 })
	})

	it('gives no step for Home, End, or another key', () => {
		expect([liftedStep('Home'), liftedStep('End'), liftedStep('a')]).toEqual([null, null, null])
	})
})
