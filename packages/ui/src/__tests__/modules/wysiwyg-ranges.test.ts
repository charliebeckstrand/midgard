// @vitest-environment node

import { history, undo } from 'prosemirror-history'
import { EditorState, TextSelection, type Transaction } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { parseMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/parse'
import {
	serializeMarkdown,
	serializeMarkdownRanges,
} from '../../modules/wysiwyg/engine/wysiwyg-markdown/serialize'
import { holdsRange, wysiwygRanges } from '../../modules/wysiwyg/engine/wysiwyg-ranges'
import { schema } from '../../modules/wysiwyg/engine/wysiwyg-schema'

/** The range of the first `quote` in `source`, from `after`. */
function range(source: string, quote: string, id = 'r', after = 0): MarkdownRange {
	const start = source.indexOf(quote, after)

	expect(start).not.toBe(-1)

	return { id, start, end: start + quote.length, quote }
}

/** The ranges of a source after a parse and a serialization. */
function roundTrip(source: string, ranges: readonly MarkdownRange[]) {
	return serializeMarkdownRanges(parseMarkdown(source, ranges))
}

/** The text that the range mark of `id` covers in a doc. */
function markedText(state: EditorState, id = 'r'): string {
	let text = ''

	state.doc.descendants((node) => {
		if (node.isText && node.marks.some((mark) => mark.attrs.id === id)) text += node.text
	})

	return text
}

/** A state of the editor with the rule of the ranges and an undo history. */
function editor(source: string, ranges: readonly MarkdownRange[]): EditorState {
	return EditorState.create({
		doc: parseMarkdown(source, ranges),
		plugins: [wysiwygRanges(), history()],
	})
}

/** The doc position of the offset `at` in the text of the first paragraph. */
const inFirst = (at: number) => 1 + at

/** Types `text` at the position `pos`. */
function type(state: EditorState, pos: number, text: string): EditorState {
	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)).insertText(text))
}

describe('wysiwyg ranges in the markdown bridge', () => {
	it('escapes a bang at the end of a range before a link', () => {
		const range = schema.marks.range.create({ id: 'c1' })

		const link = schema.marks.link.create({ href: 'https://example.com' })

		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [schema.text('Yahoo!', [range]), schema.text('here', [link])]),
		])

		const { markdown } = serializeMarkdownRanges(doc)

		expect(markdown).toBe('Yahoo\\![here](https://example.com)')
	})

	it('marks the text of a range', () => {
		const source = 'Ask about @Sales today'

		const doc = parseMarkdown(source, [range(source, '@Sales')])

		expect(markedText(EditorState.create({ doc }))).toBe('@Sales')
	})

	it.each([
		['plain text', 'Ask about @Sales today', '@Sales'],
		['bold around the range', 'Ask **about @Sales** today', '@Sales'],
		['a range across bold', 'Ask **about** @Sales today', 'about** @Sales'],
		['a range in a list', '- one\n- Ask about @Sales', '@Sales'],
		['a range in a quote', '> Ask about @Sales', '@Sales'],
		['a range in a heading', '# Ask about @Sales', '@Sales'],
		['a code span', 'Run `npm test` now', '`npm test`'],
		['an escape', 'Cost \\*total\\* now', '\\*total\\*'],
		['a bare URL', 'see https://example.com now', 'https://example.com'],
		['a link', 'see [the docs](https://example.com) now', 'the docs'],
	])('gives back the range of %s', (_, source, quote) => {
		const given = range(source, quote)

		expect(roundTrip(source, [given])).toEqual({ markdown: source, ranges: [given] })
	})

	it('moves a range to the spelling that the serializer writes', () => {
		const source = 'Ask __about__ @Sales'

		const { markdown, ranges } = roundTrip(source, [range(source, '@Sales')])

		expect(markdown).toBe('Ask **about** @Sales')
		expect(ranges).toEqual([range(markdown, '@Sales')])
	})

	it('keeps the indent of a line in a list item out of the range', () => {
		const source = '- one\n\n  Ask about @Sales'

		const { markdown, ranges } = roundTrip(source, [range(source, '@Sales')])

		expect(ranges).toEqual([range(markdown, '@Sales')])
	})

	it('takes a whole code span for a range that covers part of it', () => {
		const source = 'Run `npm test` now'

		const { ranges } = roundTrip(source, [range(source, 'npm')])

		expect(ranges.map((each) => each.quote)).toEqual(['`npm test`'])
	})

	it('keeps a soft break in a range as a space of the range', () => {
		const source = 'Ask about\n@Sales today'

		const { markdown, ranges } = roundTrip(source, [range(source, 'about\n@Sales')])

		expect(markdown).toBe('Ask about @Sales today')
		expect(ranges).toEqual([range(markdown, 'about @Sales')])
	})

	it('escapes a closing sequence in a range at the end of a heading', () => {
		const source = '# Ticket \\#'

		expect(roundTrip(source, [range(source, '\\#')]).markdown).toBe(source)
	})

	it('drops a range in a code block, which holds no mark', () => {
		const source = '```\n@Sales\n```'

		expect(roundTrip(source, [range(source, '@Sales')]).ranges).toEqual([])
	})

	it('drops a range whose quote does not match the source', () => {
		const source = 'Ask about @Sales'

		expect(roundTrip(source, [{ id: 'r', start: 0, end: 3, quote: 'Bye' }]).ranges).toEqual([])
	})

	it('keeps two ranges apart', () => {
		const source = 'Compare @Sales and @Costs'

		const given = [range(source, '@Sales', 'a'), range(source, '@Costs', 'b')]

		expect(roundTrip(source, given).ranges).toEqual(given)
	})

	it('writes no edge mark into the plain serialization', () => {
		const source = 'Ask about @Sales'

		expect(serializeMarkdown(parseMarkdown(source, [range(source, '@Sales')]))).toBe(source)
	})

	it('picks edge marks that the text of the doc does not hold', () => {
		const source = 'Icons  and @Sales'

		const given = range(source, '@Sales')

		expect(roundTrip(source, [given])).toEqual({ markdown: source, ranges: [given] })
	})

	it('reads no range from pasted HTML, because the mark has no parse rule', () => {
		expect(schema.marks.range.spec.parseDOM).toBeUndefined()
	})
})

describe('the rule of the wysiwyg ranges', () => {
	const source = 'Ask about @Sales today'

	const given = range(source, '@Sales')

	it('keeps a range across an edit outside it', () => {
		const state = type(editor(source, [given]), inFirst(0), 'Please ')

		const { markdown, ranges } = serializeMarkdownRanges(state.doc)

		expect(ranges).toEqual([range(markdown, '@Sales')])
	})

	it('removes the range of an edit in it, and keeps its text', () => {
		const state = type(editor(source, [given]), inFirst(given.start + 2), 'x')

		expect(serializeMarkdownRanges(state.doc)).toEqual({
			markdown: 'Ask about @Sxales today',
			ranges: [],
		})
	})

	it('does not grow a range on a key typed at its end', () => {
		const state = type(editor(source, [given]), inFirst(given.end), 's')

		expect(markedText(state)).toBe('@Sales')
	})

	it('removes the range of a split of its block', () => {
		const start = editor(source, [given])

		const state = start.apply(start.tr.split(inFirst(given.start + 2)))

		expect(serializeMarkdownRanges(state.doc).ranges).toEqual([])
	})

	it('brings a removed range back on an undo', () => {
		const edited = type(editor(source, [given]), inFirst(given.start + 2), 'x')

		let state = edited

		undo(state, (tr: Transaction) => {
			state = state.apply(tr)
		})

		expect(serializeMarkdownRanges(state.doc)).toEqual({ markdown: source, ranges: [given] })
	})

	it('keeps whether the doc holds a range across each edit', () => {
		let state = editor(source, [])

		expect(holdsRange(state)).toBe(false)

		state = type(state, inFirst(0), 'Please ')

		expect(holdsRange(state)).toBe(false)

		const mark = schema.marks.range.create({ id: 'r' })

		state = state.apply(state.tr.addMark(inFirst(0), inFirst(6), mark))

		expect(holdsRange(state)).toBe(true)

		state = type(state, inFirst(2), 'x')

		expect(holdsRange(state)).toBe(false)
	})

	it('removes a range that an undo brought back on the next edit in it', () => {
		let state = type(editor(source, [given]), inFirst(given.start + 2), 'x')

		undo(state, (tr: Transaction) => {
			state = state.apply(tr)
		})

		expect(holdsRange(state)).toBe(true)

		state = type(state, inFirst(given.start + 3), 'y')

		expect(serializeMarkdownRanges(state.doc, holdsRange(state))).toEqual({
			markdown: 'Ask about @Sayles today',
			ranges: [],
		})
	})
})
