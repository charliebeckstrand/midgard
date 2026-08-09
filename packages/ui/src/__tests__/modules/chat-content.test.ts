import { describe, expect, it } from 'vitest'
import {
	isEmptyContent,
	TEXT_PART_ID,
	toChatParts,
} from '../../modules/chat/engine/chat-content/normalize'
import { chatContentText, chatPartsText } from '../../modules/chat/engine/chat-content/text'
import type { ChatPart, ChatTextPart } from '../../modules/chat/engine/chat-content/types'

/** A text part, in the shape the normalization mints one. */
function text(value: string, id = TEXT_PART_ID): ChatTextPart {
	return { kind: 'text', id, text: value }
}

/**
 * The strings a transcript already carries: a plain line, an empty reply, a
 * message with blank lines of its own, a fenced code block, padding the
 * projection must not trim, and non-ASCII text.
 */
const CONTENT = [
	{ label: 'a plain line', content: 'Twelve stops are late.' },
	{ label: 'an empty reply', content: '' },
	{ label: 'blank lines of its own', content: 'First block.\n\nSecond block.' },
	{ label: 'a fenced code block', content: 'Run it:\n\n```ts\nconst a = 1\n```\n' },
	{ label: 'leading and trailing space', content: '  padded  ' },
	{ label: 'non-ASCII text', content: 'Route 12 → Malmö, 3 km' },
] as const

describe('toChatParts', () => {
	it('turns a string into exactly one text part', () => {
		expect(toChatParts('Twelve stops are late.')).toEqual([
			{ kind: 'text', id: TEXT_PART_ID, text: 'Twelve stops are late.' },
		])
	})

	it('turns an empty string into one empty text part rather than no part', () => {
		// The transcript opens an empty reply while an answer arrives. That reply
		// holds one block with nothing in it yet, not a message with no block.
		expect(toChatParts('')).toEqual([{ kind: 'text', id: TEXT_PART_ID, text: '' }])
	})

	it('names the one part it mints with a fixed id, so the engine reads no random source', () => {
		// Increment 5 replaces the text this name points to, so a string chunk
		// arriving after a chart neither deletes it nor opens a second running text.
		expect(toChatParts('Twelve stops are late.')[0]?.id).toBe(TEXT_PART_ID)
	})

	it('passes a part list through by reference', () => {
		// A memoized bubble reads the same array it got, so normalization costs it
		// no re-render.
		const parts: ChatPart[] = [text('First block.'), text('Second block.')]

		expect(toChatParts(parts)).toBe(parts)
	})

	it('leaves an empty part list empty', () => {
		expect(toChatParts([])).toEqual([])
	})
})

describe('chatPartsText', () => {
	it('projects one text part to its own text', () => {
		expect(chatPartsText([text('Twelve stops are late.')])).toBe('Twelve stops are late.')
	})

	it('projects no parts to an empty string', () => {
		expect(chatPartsText([])).toBe('')
	})

	it('joins two text parts with a blank line', () => {
		expect(chatPartsText([text('First block.'), text('Second block.')])).toBe(
			'First block.\n\nSecond block.',
		)
	})

	it('drops a part that projects to nothing rather than leave a blank gap', () => {
		expect(chatPartsText([text('First block.'), text(''), text('Second block.')])).toBe(
			'First block.\n\nSecond block.',
		)
	})
})

describe('isEmptyContent', () => {
	// The rollback rule reads this. It reads structure and never the projection,
	// because a reply that holds a block with no text of its own projects to an
	// empty string and is not an empty reply.
	it('reads an empty string as empty', () => {
		expect(isEmptyContent('')).toBe(true)
	})

	it('reads a string with text as not empty', () => {
		expect(isEmptyContent('Twelve stops are late.')).toBe(false)
	})

	it('reads the one empty text part an opened reply holds as empty', () => {
		expect(isEmptyContent(toChatParts(''))).toBe(true)
	})

	it('reads no parts as empty', () => {
		expect(isEmptyContent([])).toBe(true)
	})

	it('reads one part with text as not empty, whatever sits beside it', () => {
		expect(isEmptyContent([text(''), text('Second block.', 'b')])).toBe(false)
	})
})

describe('chatContentText', () => {
	it('returns a string arm unchanged, by reference', () => {
		const content = 'Twelve stops are late.'

		expect(chatContentText(content)).toBe(content)
	})

	it('projects a part arm through the part projection', () => {
		expect(chatContentText([text('First block.'), text('Second block.', 'b')])).toBe(
			'First block.\n\nSecond block.',
		)
	})
})

describe('chat content round trip', () => {
	// The claim the increment rests on: a `content: string` normalizes to one
	// text part and projects back to the same string, so a transcript of strings
	// renders byte-identically before and after the union lands.
	for (const { label, content } of CONTENT) {
		it(`returns ${label} unchanged`, () => {
			expect(chatPartsText(toChatParts(content))).toBe(content)
		})
	}
})
