// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { TEXT_PART_ID } from '../../modules/chat/engine/chat-content/normalize'
import type { ChatCitation } from '../../modules/chat/engine/chat-content/types'
import {
	buildUserContent,
	canSubmitDraft,
	toDraftCitations,
	toDraftContent,
} from '../../modules/chat/engine/chat-draft/content'

describe('toDraftContent', () => {
	it.for<[string, string, string]>([
		['drops the whitespace around the value', '  hello  ', 'hello'],
		['keeps the whitespace inside the value', ' two words\nand a line ', 'two words\nand a line'],
		['is empty for an empty draft', '', ''],
		['is empty for whitespace alone, including tabs and newlines', '   ', ''],
		['is empty for whitespace alone, including tabs and newlines', '\t\n ', ''],
	])('%s (%j)', ([, draft, content]) => {
		expect(toDraftContent(draft)).toBe(content)
	})
})

describe('canSubmitDraft', () => {
	it.each(['', '   '])('is false for the draft %j', (draft) => {
		expect(canSubmitDraft(draft)).toBe(false)
	})

	it('is true once the draft holds a character', () => {
		expect(canSubmitDraft('hi')).toBe(true)

		expect(canSubmitDraft('  hi  ')).toBe(true)
	})
})

const QUOTE = '@Late stops'

const citation = (start: number): ChatCitation => ({
	id: 'c1',
	start,
	end: start + QUOTE.length,
	quote: QUOTE,
	target: 'dataset',
	selector: { datasets: ['late'] },
})

describe('toDraftCitations', () => {
	it('moves each citation back by the whitespace that the trim removes', () => {
		expect(toDraftCitations(`  ${QUOTE} by day `, [citation(2)])).toEqual([citation(0)])
	})

	it('gives the same array when the trim moves nothing', () => {
		const citations = [citation(0)]

		expect(toDraftCitations(`${QUOTE} by day`, citations)).toBe(citations)
	})

	it('drops a citation whose quote is not at its address', () => {
		expect(toDraftCitations(`  ${QUOTE} by day`, [citation(3)])).toEqual([])
	})

	it('drops a citation that the trim cuts', () => {
		const cut: ChatCitation = { ...citation(0), end: 1, quote: ' ' }

		expect(toDraftCitations(' x', [cut])).toEqual([])
	})
})

describe('buildUserContent', () => {
	it('keeps text with no citation as a string', () => {
		expect(buildUserContent('hello', [])).toBe('hello')
	})

	it('gives one text part under the fixed name when the text holds citations', () => {
		expect(buildUserContent(`${QUOTE} by day`, [citation(0)])).toEqual([
			{ kind: 'text', id: TEXT_PART_ID, text: `${QUOTE} by day`, citations: [citation(0)] },
		])
	})
})
