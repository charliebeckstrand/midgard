// @vitest-environment node

import { AllSelection, EditorState, TextSelection, type Transaction } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import {
	exitCodeOnEmptyLine,
	linkDraft,
	setLink,
	wysiwygCommands,
} from '../../modules/wysiwyg/engine/wysiwyg-commands'
import { parseMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/parse'
import { serializeMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/serialize'
import { schema } from '../../modules/wysiwyg/engine/wysiwyg-schema'

/** Runs the Code block action with the caret in the first block, and gives the Markdown. */
function toggleCodeBlock(source: string): string {
	let state = EditorState.create({ doc: parseMarkdown(source) })

	state = state.apply(state.tr.setSelection(EditorState.create({ doc: state.doc }).selection))

	const ran = wysiwygCommands.codeBlock.run(state, (tr: Transaction) => {
		state = state.apply(tr)
	})

	expect(ran).toBe(true)

	return serializeMarkdown(state.doc)
}

describe('the Code block action', () => {
	it('keeps the line breaks of a paragraph as lines of the code', () => {
		expect(toggleCodeBlock('one\\\ntwo')).toBe('```\none\ntwo\n```')
	})

	it('keeps the lines of the code as line breaks of a paragraph', () => {
		expect(toggleCodeBlock('```\none\ntwo\n```')).toBe('one\\\ntwo')
	})

	it('keeps an inline atom as its source in the code', () => {
		expect(toggleCodeBlock('See ![chart](chart.png) here')).toBe(
			'```\nSee ![chart](chart.png) here\n```',
		)
	})
})

describe('a mark action on a range', () => {
	it('adds the mark to a range that has it in part, as its off state says, and then removes it', () => {
		// A partly bold paragraph, and a code block whose text cannot be bold.
		let state = EditorState.create({ doc: parseMarkdown('a **b** c\n\n```\ncode\n```') })

		state = state.apply(
			state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)),
		)

		const bold = wysiwygCommands.bold

		const press = () =>
			bold.run(state, (tr: Transaction) => {
				state = state.apply(tr)
			})

		expect(bold.active(state)).toBe(false)

		press()

		expect(serializeMarkdown(state.doc)).toBe('**a b c**\n\n```\ncode\n```')

		expect(bold.active(state)).toBe(true)

		press()

		expect(serializeMarkdown(state.doc)).toBe('a b c\n\n```\ncode\n```')
	})
})

/** Runs a block action on a state, and gives the Markdown and whether the action is then on. */
function runBlock(state: EditorState, action: 'bulletList' | 'quote') {
	let next = state

	const ran = wysiwygCommands[action].run(state, (tr: Transaction) => {
		next = next.apply(tr)
	})

	return {
		ran,
		markdown: serializeMarkdown(next.doc),
		active: wysiwygCommands[action].active(next),
	}
}

/** A state of a source with all of the doc selected, as Mod+A selects it. */
function selectAll(source: string): EditorState {
	const state = EditorState.create({ doc: parseMarkdown(source) })

	return state.apply(state.tr.setSelection(new AllSelection(state.doc)))
}

describe('a block action', () => {
	it('reads a selection of the whole doc as its text, so a list or a quote turns off', () => {
		expect(wysiwygCommands.bulletList.active(selectAll('- a\n- b'))).toBe(true)

		expect(runBlock(selectAll('- a\n- b'), 'bulletList')).toEqual({
			ran: true,
			markdown: 'a\n\nb',
			active: false,
		})

		expect(runBlock(selectAll('> a\n>\n> b'), 'quote')).toEqual({
			ran: true,
			markdown: 'a\n\nb',
			active: false,
		})
	})

	it('quotes the whole list from a list item, and takes the list out of the quote again', () => {
		// The caret in the text of the first item.
		const quoted = runBlock(selectText('- a\n- b', 2), 'quote')

		expect(quoted).toEqual({ ran: true, markdown: '> - a\n> - b', active: true })

		const state = EditorState.create({ doc: parseMarkdown(quoted.markdown) })

		const caret = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 4)))

		expect(runBlock(caret, 'quote')).toEqual({ ran: true, markdown: '- a\n- b', active: false })
	})
})

/**
 * A state of a source with the selection from `from` to `to`, as offsets in
 * the text of its one paragraph.
 */
function selectText(source: string, from: number, to = from): EditorState {
	const state = EditorState.create({ doc: parseMarkdown(source) })

	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, from + 1, to + 1)))
}

/** Runs the link of the popover on a state, and gives the Markdown and the selected text. */
function link(state: EditorState, href: string, text: string) {
	let next = state

	setLink(href, text)(state, (tr: Transaction) => {
		next = next.apply(tr)
	})

	const { from, to } = next.selection

	return { markdown: serializeMarkdown(next.doc), selected: next.doc.textBetween(from, to) }
}

describe('the link of the popover', () => {
	it('gives the selected text, and the text and the URL of a link at the caret', () => {
		expect(linkDraft(selectText('Read the docs', 5, 8))).toEqual({ text: 'the', href: '' })

		expect(linkDraft(selectText('Read [the docs](https://a.dev) now', 7))).toEqual({
			text: 'the docs',
			href: 'https://a.dev',
		})

		expect(linkDraft(selectText('Read', 4))).toEqual({ text: '', href: '' })
	})

	it('links the selected text, keeps its marks, and keeps it selected', () => {
		expect(link(selectText('Read **the** docs', 5, 8), 'https://a.dev', 'the')).toEqual({
			markdown: 'Read [**the**](https://a.dev) docs',
			selected: 'the',
		})
	})

	it('replaces the selected text with new text, and selects it', () => {
		expect(link(selectText('Read the docs', 5, 13), 'https://a.dev', 'the guide')).toEqual({
			markdown: 'Read [the guide](https://a.dev)',
			selected: 'the guide',
		})
	})

	it('puts the text and the link in at the caret, and the caret after it', () => {
		const state = selectText('Read  now', 5)

		expect(link(state, 'https://a.dev', 'the docs')).toEqual({
			markdown: 'Read [the docs](https://a.dev) now',
			selected: '',
		})

		// A link whose text is its URL is an autolink.
		expect(link(state, 'https://a.dev', '').markdown).toBe('Read https://a.dev now')
	})

	it('changes the text and the URL of the link at the caret', () => {
		expect(
			link(selectText('Read [the docs](https://a.dev) now', 7), 'https://b.dev', 'it'),
		).toEqual({ markdown: 'Read [it](https://b.dev) now', selected: '' })
	})

	it('removes the link with an empty URL, and the text stays', () => {
		expect(link(selectText('Read [the docs](https://a.dev) now', 7), '', 'the docs').markdown).toBe(
			'Read the docs now',
		)
	})

	it('puts no link in a code block', () => {
		expect(link(selectText('```\ncode\n```', 2), 'https://a.dev', 'x').markdown).toBe(
			'```\ncoxde\n```',
		)
	})
})

/**
 * Runs the new-line exit with the caret at the end of a code block of `code`,
 * and a paragraph of `next` after it when given. It gives the Markdown and the
 * type of the block of the caret, or `null` when the command does not apply.
 */
function newLineAtCodeEnd(
	code: string,
	next?: string,
): { markdown: string; caretIn: string } | null {
	const blocks = [schema.node('code_block', null, code ? schema.text(code) : undefined)]

	if (next) blocks.push(schema.node('paragraph', null, schema.text(next)))

	let state = EditorState.create({ doc: schema.node('doc', null, blocks) })

	state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1 + code.length)))

	const ran = exitCodeOnEmptyLine(state, (tr: Transaction) => {
		state = state.apply(tr)
	})

	if (!ran) return null

	return { markdown: serializeMarkdown(state.doc), caretIn: state.selection.$head.parent.type.name }
}

describe('a new line at the end of a code block', () => {
	it('stays in the code after a line with text', () => {
		expect(newLineAtCodeEnd('one')).toBeNull()
	})

	it('leaves the code on an empty last line, and removes that line', () => {
		expect(newLineAtCodeEnd('one\n')).toEqual({ markdown: '```\none\n```', caretIn: 'paragraph' })
	})

	it('puts the paragraph right after the block, before the next block', () => {
		expect(newLineAtCodeEnd('one\n', 'Next')).toEqual({
			markdown: '```\none\n```\n\nNext',
			caretIn: 'paragraph',
		})
	})

	it('makes an empty code block a paragraph', () => {
		expect(newLineAtCodeEnd('')).toEqual({ markdown: '', caretIn: 'paragraph' })
	})
})
