// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ChatCitation } from '../../modules/chat/engine/chat-content/types'
import { activeTrigger, chooseInTrigger } from '../../modules/chat/engine/chat-draft/trigger'

const RULES = [{ trigger: '@' }, { trigger: '/', at: 'start' as const }]

const scope = (start: number, quote: string): ChatCitation => ({
	id: 'c1',
	start,
	end: start + quote.length,
	quote,
	target: 'dataset',
	selector: null,
})

describe('activeTrigger', () => {
	it('finds a trigger at the start of the draft', () => {
		expect(activeTrigger('@la', 3, RULES)).toEqual({ index: 0, start: 0, query: 'la' })
	})

	it('finds a trigger after whitespace, with an empty query', () => {
		expect(activeTrigger('show @', 6, RULES)).toEqual({ index: 0, start: 5, query: '' })
	})

	it('reads the query up to the caret', () => {
		expect(activeTrigger('@late', 3, RULES)).toEqual({ index: 0, start: 0, query: 'la' })
	})

	it.for<[string, string, number]>([
		['an email address', 'a@b.com', 3],
		['a word that whitespace ends', '@late ', 6],
		['a caret before the trigger', '@late', 0],
	])('finds no trigger in %s', ([, value, caret]) => {
		expect(activeTrigger(value, caret, RULES)).toBeNull()
	})

	it('counts a start-only trigger only at the start, after leading whitespace', () => {
		expect(activeTrigger('  /cl', 5, RULES)).toEqual({ index: 1, start: 2, query: 'cl' })

		expect(activeTrigger('1 /2', 4, RULES)).toBeNull()

		expect(activeTrigger('1/2', 3, RULES)).toBeNull()
	})

	it('finds no trigger in a citation', () => {
		expect(activeTrigger('@Late stops', 5, RULES, [scope(0, '@Late stops')])).toBeNull()
	})
})

describe('chooseInTrigger', () => {
	const citation = { id: 'c2', target: 'dataset', selector: { dataset: 'late' } }

	it('puts the quote and a space in place of the trigger and its query', () => {
		const choice = chooseInTrigger(
			'show @la',
			[],
			{ index: 0, start: 5, query: 'la' },
			'@',
			'Late stops',
			citation,
		)

		expect(choice.value).toBe('show @Late stops ')

		expect(choice.citations).toEqual([{ ...citation, start: 5, end: 16, quote: '@Late stops' }])

		expect(choice.caret).toBe(17)
	})

	it('replaces the rest of the word, and adds no space before whitespace', () => {
		const choice = chooseInTrigger(
			'@lat by day',
			[],
			{ index: 0, start: 0, query: 'la' },
			'@',
			'Late stops',
			citation,
		)

		expect(choice.value).toBe('@Late stops by day')

		expect(choice.tail).toBe(4)

		expect(choice.caret).toBe(12)
	})

	it('moves a citation after the trigger and keeps one before it', () => {
		const before = scope(0, '@A')

		const after = { ...scope(6, '@B'), id: 'c3' }

		const choice = chooseInTrigger(
			'@A @x @B',
			[before, after],
			{ index: 0, start: 3, query: 'x' },
			'@',
			'Long',
			citation,
		)

		expect(choice.value).toBe('@A @Long @B')

		expect(choice.citations.map((c) => [c.id, c.start])).toEqual([
			['c1', 0],
			['c2', 3],
			['c3', 9],
		])
	})
})
