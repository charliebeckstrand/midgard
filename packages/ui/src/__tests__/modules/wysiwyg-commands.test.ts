// @vitest-environment node

import { EditorState, type Transaction } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import { wysiwygCommands } from '../../modules/wysiwyg/engine/wysiwyg-commands'
import { parseMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/parse'
import { serializeMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/serialize'

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
