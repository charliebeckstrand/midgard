// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ChatCitation } from '../../modules/chat/engine/chat-content/types'
import { draftEdit, rebaseCitations } from '../../modules/chat/engine/chat-draft/rebase'

const QUOTE = '@Qa'

/** A citation of `@Qa` at `start`. */
const at = (start: number, id = 'c1'): ChatCitation => ({
	id,
	start,
	end: start + QUOTE.length,
	quote: QUOTE,
	target: 'dataset',
	selector: { datasets: ['qa'] },
})

// `x @Qa y`: the citation is at 2 to 5.
const PREV = `x ${QUOTE} y`

describe('draftEdit', () => {
	it('finds an insertion from the two values alone', () => {
		expect(draftEdit('ab', 'aXb')).toEqual({ start: 1, end: 1, nextEnd: 2 })
	})

	it('finds a deletion from the two values alone', () => {
		expect(draftEdit('aXb', 'ab')).toEqual({ start: 1, end: 2, nextEnd: 1 })
	})

	it('finds a replacement from the two values alone', () => {
		expect(draftEdit('a12b', 'aXYZb')).toEqual({ start: 1, end: 3, nextEnd: 4 })
	})

	it('reads the caret where the two values cannot say where the change is', () => {
		// An `a` typed between `Q` and `a` gives the value of an `a` typed after `@Qa`.
		expect(draftEdit('@Qa', '@Qaa', 3)).toEqual({ start: 2, end: 2, nextEnd: 3 })

		expect(draftEdit('@Qa', '@Qaa', 4)).toEqual({ start: 3, end: 3, nextEnd: 4 })

		// With no caret, the change is as late as the values let it be.
		expect(draftEdit('@Qa', '@Qaa')).toEqual({ start: 3, end: 3, nextEnd: 4 })
	})

	it('does not read a caret that cannot end the change', () => {
		// The text after caret 0 is `ab`, and the change did not keep it.
		expect(draftEdit('a', 'ab', 0)).toEqual({ start: 1, end: 1, nextEnd: 2 })
	})
})

describe('rebaseCitations', () => {
	it('keeps a citation before the change', () => {
		const citations = [at(2)]

		expect(rebaseCitations(PREV, `${PREV}!`, citations)).toBe(citations)
	})

	it('keeps a citation that the change starts right after', () => {
		expect(rebaseCitations(PREV, `x ${QUOTE}s y`, [at(2)], 6)).toEqual([at(2)])
	})

	it('moves a citation after the change by the change in length', () => {
		expect(rebaseCitations(PREV, `xyz ${QUOTE} y`, [at(2)], 3)).toEqual([at(4)])

		expect(rebaseCitations(PREV, ` ${QUOTE} y`, [at(2)], 0)).toEqual([at(1)])
	})

	it('moves a citation when text goes in at its start', () => {
		expect(rebaseCitations(PREV, `x ab${QUOTE} y`, [at(2)], 4)).toEqual([at(4)])
	})

	it('dissolves a citation that a deletion touches', () => {
		// A Backspace on the `a` at the end of the citation.
		expect(rebaseCitations(PREV, 'x @Q y', [at(2)], 4)).toEqual([])
	})

	it('dissolves a citation when text goes in inside it', () => {
		expect(rebaseCitations(PREV, 'x @QXa y', [at(2)], 5)).toEqual([])
	})

	it('dissolves a citation when the caret puts the change inside it', () => {
		// `@Qa` to `@Qaa`: the caret at 5 says the `a` went in between `Q` and `a`.
		expect(rebaseCitations('x @Qa', 'x @Qaa', [at(2)], 5)).toEqual([])

		// The caret at 6 says the `a` went in after the citation.
		expect(rebaseCitations('x @Qa', 'x @Qaa', [at(2)], 6)).toEqual([at(2)])
	})

	it('dissolves each citation that a replacement of the whole value touches', () => {
		expect(rebaseCitations(`${QUOTE} ${QUOTE}`, '', [at(0), at(4, 'c2')])).toEqual([])
	})

	it('moves the citation after a paste and keeps the one before it', () => {
		const prev = `${QUOTE} and ${QUOTE}`

		const next = `${QUOTE} and pasted ${QUOTE}`

		expect(rebaseCitations(prev, next, [at(0), at(8, 'c2')], 15)).toEqual([at(0), at(15, 'c2')])
	})

	it('makes no citation from a pasted quote', () => {
		expect(rebaseCitations('', QUOTE, [], 3)).toEqual([])
	})

	it('gives the same array when the value does not change', () => {
		const citations = [at(2)]

		expect(rebaseCitations(PREV, PREV, citations)).toBe(citations)
	})
})
