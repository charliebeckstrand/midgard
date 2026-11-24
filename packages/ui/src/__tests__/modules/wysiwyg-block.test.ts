// @vitest-environment node

import { history, undo } from 'prosemirror-history'
import { EditorState, TextSelection } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { caretBlock, replaceInBlock } from '../../modules/wysiwyg/engine/wysiwyg-block'
import { parseMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/parse'
import {
	serializeMarkdown,
	serializeMarkdownRanges,
} from '../../modules/wysiwyg/engine/wysiwyg-markdown/serialize'
import { wysiwygRanges } from '../../modules/wysiwyg/engine/wysiwyg-ranges'
import type { WysiwygBlockRange } from '../../modules/wysiwyg/types'

/** A state of `source` with the caret at the `|` in its text. The state does not hold the `|`. */
function at(source: string, ranges: readonly MarkdownRange[] = []): EditorState {
	const doc = parseMarkdown(source, ranges)

	let marker = -1

	doc.descendants((node, pos) => {
		const index = node.isText ? (node.text ?? '').indexOf('|') : -1

		if (marker === -1 && index !== -1) marker = pos + index
	})

	expect(marker).not.toBe(-1)

	const state = EditorState.create({ doc, plugins: [wysiwygRanges(), history()] })

	const tr = state.tr.delete(marker, marker + 1)

	return state.apply(tr.setSelection(TextSelection.create(tr.doc, marker)))
}

/** The state after {@link replaceInBlock} on `state`, which must change it. */
function replaced(
	state: EditorState,
	from: number,
	to: number,
	text: string,
	range?: WysiwygBlockRange,
): EditorState {
	const tr = replaceInBlock(state, from, to, text, range)

	if (!tr) throw new Error('The replace changed nothing.')

	return state.apply(tr)
}

describe('caretBlock', () => {
	it('gives the text of the block and the offset of the caret', () => {
		expect(caretBlock(at('Ask @Sa| today'))).toEqual({
			text: 'Ask @Sa today',
			caret: 7,
			ranges: [],
		})
	})

	it('reads the text with no Markdown syntax', () => {
		expect(caretBlock(at('Ask **bold** @Sa|'))?.text).toBe('Ask bold @Sa')
	})

	it('gives the ranges of the block as offsets of its text', () => {
		const source = 'See @Sales and @Ma'

		const start = source.indexOf('@Sales')

		const state = at(`${source}|`, [{ id: 'c1', start, end: start + 6, quote: '@Sales' }])

		expect(caretBlock(state)?.ranges).toEqual([{ id: 'c1', start: 4, end: 10 }])
	})

	it('gives null for a selection that is not a caret', () => {
		const state = at('Ask @Sa|')

		const range = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 4)))

		expect(caretBlock(range)).toBeNull()
	})

	it('gives null in a code block', () => {
		const doc = parseMarkdown('```\n@Sa\n```')

		const state = EditorState.create({ doc })

		expect(caretBlock(state.apply(state.tr.setSelection(TextSelection.create(doc, 2))))).toBeNull()
	})
})

describe('replaceInBlock', () => {
	it('replaces a span of the block, marks the range, and puts the caret after the text', () => {
		const next = replaced(at('Ask @Ma|'), 4, 7, '@Marketing ', { id: 'c1', start: 4, end: 14 })

		expect(caretBlock(next)).toEqual({
			text: 'Ask @Marketing ',
			caret: 15,
			ranges: [{ id: 'c1', start: 4, end: 14 }],
		})

		expect(serializeMarkdownRanges(next.doc)).toEqual({
			markdown: 'Ask @Marketing ',
			ranges: [{ id: 'c1', start: 4, end: 14, quote: '@Marketing' }],
		})
	})

	it('writes a label with Markdown characters as text, with escapes in the source', () => {
		const label = '@*Q3* [plan]'

		const next = replaced(at('Ask @|'), 4, 5, `${label} `, { id: 'c1', start: 4, end: 16 })

		expect(caretBlock(next)?.text).toBe(`Ask ${label} `)

		const { markdown, ranges } = serializeMarkdownRanges(next.doc)

		expect(markdown).toBe('Ask @\\*Q3\\* \\[plan\\] ')

		// The source keeps the label as text: a parse of it gives the label back.
		expect(parseMarkdown(markdown).textContent).toBe(`Ask ${label} `)

		expect(ranges).toEqual([{ id: 'c1', start: 4, end: 20, quote: '@\\*Q3\\* \\[plan\\]' }])
	})

	it('is one step of the undo history, apart from the text before it', () => {
		const next = replaced(at('Ask @Ma|'), 4, 7, '@Marketing ', { id: 'c1', start: 4, end: 14 })

		let undone = ''

		undo(next, (tr) => {
			undone = serializeMarkdown(next.apply(tr).doc)
		})

		expect(undone).toBe('Ask @Ma')
	})

	it.each([
		['a span outside the block', 4, 40, undefined],
		['a reversed span', 6, 4, undefined],
		['a range outside the new text', 4, 7, { id: 'c1', start: 4, end: 40 }],
	])('changes nothing for %s', (_, from, to, range) => {
		expect(replaceInBlock(at('Ask @Ma|'), from, to, '@Marketing ', range)).toBeNull()
	})
})
