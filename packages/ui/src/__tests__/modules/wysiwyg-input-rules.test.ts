// @vitest-environment jsdom

import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { describe, expect, it } from 'vitest'
import { wysiwygInputRules } from '../../modules/wysiwyg/engine/wysiwyg-input-rules'
import { parseMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/parse'
import { serializeMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/serialize'
import { schema } from '../../modules/wysiwyg/engine/wysiwyg-schema'

/**
 * Types each character of `keys` at the end of an empty field, as the view
 * gives a typed character to the input rules, and gives the Markdown. With
 * `code`, the text goes in with the code mark on, as after a press on the
 * Code action.
 */
function typeIn(keys: string, code = false): string {
	let state = EditorState.create({ doc: parseMarkdown(''), plugins: [wysiwygInputRules()] })

	state = state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)))

	if (code) state = state.apply(state.tr.addStoredMark(schema.marks.code.create()))

	const view = new EditorView(document.createElement('div'), { state })

	for (const char of keys) {
		const { from, to } = view.state.selection

		const insert = () => view.state.tr.insertText(char, from, to)

		if (!view.someProp('handleTextInput', (handle) => handle(view, from, to, char, insert))) {
			view.dispatch(insert())
		}
	}

	const markdown = serializeMarkdown(view.state.doc)

	view.destroy()

	return markdown
}

describe('the Markdown shortcuts of a Wysiwyg', () => {
	it.each([
		['a **b** c', 'a **b** c'],
		['a __b__ c', 'a **b** c'],
		['a *b* c', 'a *b* c'],
		['a _b_ c', 'a *b* c'],
		['a ~~b~~ c', 'a ~~b~~ c'],
		['a `b` c', 'a `b` c'],
		['foo__bar__', 'foo\\_\\_bar\\_\\_'],
		['**a *b***', '**a *b***'],
		['`2*3*4`', '`2*3*4`'],
		['**a `c` b**', '**a `c` b**'],
	])('turns %j into %j', (keys, markdown) => {
		expect(typeIn(keys)).toBe(markdown)
	})

	it.each([
		['a `xy`**b**', 'a `xy`**b**'],
		['`x`**b**', '`x`**b**'],
		['a `xy`*b*', 'a `xy`*b*'],
		['a `xy`~~b~~', 'a `xy`~~b~~'],
	])('makes emphasis right after a code span: %j', (keys, markdown) => {
		expect(typeIn(keys)).toBe(markdown)
	})

	it('makes no emphasis in text that has the code mark', () => {
		expect(typeIn('a **b**', true)).toBe('`a **b**`')
	})
})
