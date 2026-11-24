// @vitest-environment node

import { EditorState, TextSelection, type Transaction } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import { exitCodeOnEmptyLine, wysiwygCommands } from '../../modules/wysiwyg/engine/wysiwyg-commands'
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
