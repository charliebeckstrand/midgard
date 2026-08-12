import { describe, expect, it, vi } from 'vitest'
import {
	classifyTokens,
	describeBatch,
	splitTokens,
} from '../../components/tag-input/tag-input-utilities'

describe('splitTokens', () => {
	it.each([
		['a comma-separated list', '77002,77003,77004', ['77002', '77003', '77004']],
		// The commonest paste into a token field, and the one a native input cannot split for itself:
		// HTML value sanitization strips newlines, so only a paste handler still sees these.
		['a newline-separated column', '77002\n77003\n77004', ['77002', '77003', '77004']],
		['a Windows-newline column', '77002\r\n77003', ['77002', '77003']],
		['a tab-separated row', '77002\t77003', ['77002', '77003']],
		['a semicolon list, as comma-decimal locales export', '77002;77003', ['77002', '77003']],
		['mixed delimiters and runs of them', '77002, ,\n\n77003 ,77004', ['77002', '77003', '77004']],
		['surrounding whitespace', '  77002 , 77003  ', ['77002', '77003']],
		['a single token', '77002', ['77002']],
		['nothing but delimiters', ' ,;\n', []],
		['an empty string', '', []],
	])('splits %s', (_name, raw, expected) => {
		expect(splitTokens(raw)).toEqual(expected)
	})
})

describe('classifyTokens', () => {
	it('sorts candidates into accepted, duplicate, over-limit and rejected', () => {
		const batch = classifyTokens(
			['77002', '77002', 'nope', '77003', '77004'],
			['77001'],
			// `room` is how many MORE fit, not the cap — one tag is already held.
			2,
			(tag) => /^\d{5}$/.test(tag),
		)

		// 77002 once; its repeat is a duplicate within the batch. 'nope' fails validation. 77003 takes
		// the last slot, so 77004 has no room.
		expect(batch.accepted).toEqual(['77002', '77003'])

		expect(batch.duplicates).toEqual(['77002'])

		expect(batch.rejected).toEqual(['nope'])

		expect(batch.overLimit).toBe(1)
	})

	it('counts a candidate already held as a duplicate', () => {
		expect(classifyTokens(['a'], ['a'], 10).duplicates).toEqual(['a'])
	})

	it('never shows validate a duplicate or an over-limit candidate', () => {
		const validate = vi.fn(() => true)

		classifyTokens(['held', 'new', 'spare'], ['held'], 1, validate)

		// The documented order is duplicate, then limit, then validate — so validate only ever sees
		// novel, within-limit candidates however the tokens arrived.
		expect(validate).toHaveBeenCalledTimes(1)

		expect(validate).toHaveBeenCalledWith('new')
	})

	it('treats an infinite room as uncapped', () => {
		const batch = classifyTokens(['a', 'b', 'c'], [], Number.POSITIVE_INFINITY)

		expect(batch.accepted).toEqual(['a', 'b', 'c'])

		expect(batch.overLimit).toBe(0)
	})
})

describe('describeBatch', () => {
	const empty = { accepted: [], rejected: [], duplicates: [], overLimit: 0 }

	it.each([
		['says nothing when nothing happened', empty, ''],
		// A batch of one reads as that token's own name, so entering one code by paste sounds the same
		// as entering it by keystroke.
		['names a single addition', { ...empty, accepted: ['react'] }, 'Added react.'],
		['counts a batch of additions', { ...empty, accepted: ['a', 'b'] }, 'Added 2 tags.'],
		[
			'names a single duplicate',
			{ ...empty, duplicates: ['react'] },
			'react is already in the list.',
		],
		['counts several duplicates', { ...empty, duplicates: ['a', 'b'] }, '2 already in the list.'],
		['names a single rejection', { ...empty, rejected: ['x'] }, 'x is not a valid tag.'],
		['counts several rejections', { ...empty, rejected: ['x', 'y'] }, '2 not valid.'],
		['reports the cap', { ...empty, overLimit: 3 }, 'Tag limit reached.'],
	])('%s', (_name, batch, expected) => {
		expect(describeBatch(batch)).toBe(expected)
	})

	it('joins every outcome into one message', () => {
		// ONE announcement per commit, not one per tag: forty separate live-region messages for a single
		// paste is worse for a screen-reader user than the silence this replaced (WCAG 4.1.3).
		expect(
			describeBatch({ accepted: ['a', 'b'], rejected: ['x'], duplicates: ['c'], overLimit: 2 }),
		).toBe('Added 2 tags. c is already in the list. Tag limit reached. x is not a valid tag.')
	})
})
