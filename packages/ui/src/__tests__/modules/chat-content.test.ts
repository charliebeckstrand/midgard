import { describe, expect, it } from 'vitest'
import {
	isEmptyContent,
	TEXT_PART_ID,
	toChatParts,
} from '../../modules/chat/engine/chat-content/normalize'
import { chatContentText, chatPartsText } from '../../modules/chat/engine/chat-content/text'
import type {
	ChatEmbedPart,
	ChatPart,
	ChatTextPart,
	ChatToolPart,
} from '../../modules/chat/engine/chat-content/types'

/** A text part, in the shape the normalization mints one. */
function text(value: string, id = TEXT_PART_ID): ChatTextPart {
	return { kind: 'text', id, text: value }
}

/** An embed part naming a renderer the caller registered. */
function embed(name: string, id = name): ChatEmbedPart {
	return { kind: 'embed', id, name, data: { rows: 12 } }
}

/** A step the assistant took, with its one-line summary and a body behind it. */
function tool(overrides: Partial<ChatToolPart> = {}): ChatToolPart {
	return {
		kind: 'tool',
		id: 't1',
		name: 'Filter shipments',
		status: 'done',
		summary: 'status is late and lane is north',
		detail: 'Matched **12** of 240 rows.',
		...overrides,
	}
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

	it('names every string it normalizes with the same id, because the id is fixed', () => {
		// The engine reads no random source, so increment 5 can replace the text
		// this one name points to: a string chunk arriving after a chart neither
		// deletes that chart nor opens a second running text.
		expect(toChatParts('first')[0]?.id).toBe(toChatParts('second')[0]?.id)
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

	it('projects an embed to nothing, so the prose around it closes up', () => {
		// The renderer holds an embed's text — a chart ships its own data table —
		// and this projection cannot reach it. A guess would put a name the reader
		// never saw into the clipboard, the search index, and the announcement.
		expect(chatPartsText([text('Twelve stops are late.'), embed('stops-map')])).toBe(
			'Twelve stops are late.',
		)
	})

	it('projects an embed alone to an empty string', () => {
		expect(chatPartsText([embed('stops-map')])).toBe('')
	})

	it('projects a step to its own line, because the module wrote that line', () => {
		// The difference from an embed: a step describes itself in text, so the
		// clipboard, the search index, and the announcement can all have it.
		expect(chatPartsText([tool()])).toBe('Filter shipments: status is late and lane is north')
	})

	it('projects a step with no summary to its name alone', () => {
		expect(chatPartsText([tool({ summary: undefined })])).toBe('Filter shipments')
	})

	it('leaves a step’s detail out of the projection', () => {
		// The detail is the body behind a disclosure the reader has not opened.
		expect(chatPartsText([tool()])).not.toContain('240 rows')
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

	it('reads a reply that arrived as an embed alone as not empty', () => {
		// The pair that proves the rule reads structure rather than the
		// projection: this content projects to '' and must survive the rollback,
		// because a chart with no prose around it is a reply that landed.
		const content = [embed('stops-map')]

		expect(chatPartsText(content)).toBe('')

		expect(isEmptyContent(content)).toBe(false)
	})

	it('reads an embed beside an empty text part as not empty', () => {
		expect(isEmptyContent([text(''), embed('stops-map')])).toBe(false)
	})

	it('reads a reply that opened with a running step as not empty', () => {
		// A reply showing the query it is running is not an empty reply, so a
		// failure after it must keep the step rather than roll the reply back.
		expect(isEmptyContent([tool({ status: 'running', detail: undefined })])).toBe(false)
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
