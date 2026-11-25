// @vitest-environment jsdom

import type { Node as ProseMirrorNode } from 'prosemirror-model'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { describe, expect, it } from 'vitest'
import { fenceOnEnter, wysiwygInputRules } from '../../modules/wysiwyg/engine/wysiwyg-input-rules'
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

const { nodes } = schema

/**
 * Puts the caret in `doc` after the text `before` of the first block that
 * holds it, runs Enter on the fence, and gives if the command ran and the
 * Markdown after it.
 */
function enterAfter(doc: ProseMirrorNode, before: string): [boolean, string] {
	let caret = -1

	doc.descendants((node, pos) => {
		if (caret < 0 && node.isTextblock && node.textContent.startsWith(before)) {
			caret = pos + 1 + before.length
		}
	})

	let state = EditorState.create({ doc })

	state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, caret)))

	const ran = fenceOnEnter(state, (tr) => {
		state = state.apply(tr)
	})

	return [ran, serializeMarkdown(state.doc)]
}

const paragraph = (text: string) => nodes.paragraph.create(null, text ? schema.text(text) : null)

describe('the fence rule on Enter', () => {
	it.each([
		['```js', '```js\n\n```'],
		['```', '```\n\n```'],
		['```C++', '```C++\n\n```'],
	])('makes a code block from %j', (text, markdown) => {
		expect(enterAfter(nodes.doc.create(null, paragraph(text)), text)).toEqual([true, markdown])
	})

	it('keeps the text after the caret as the code', () => {
		expect(enterAfter(nodes.doc.create(null, paragraph('```jsconst a')), '```js')).toEqual([
			true,
			'```js\nconst a\n```',
		])
	})

	it.each(['``js', 'a ```js', '```js x', '````'])('does nothing after %j', (text) => {
		const doc = nodes.doc.create(null, paragraph(text))

		expect(enterAfter(doc, text)).toEqual([false, serializeMarkdown(doc)])
	})

	it('does nothing in a code block', () => {
		const doc = nodes.doc.create(null, nodes.code_block.create(null, schema.text('```js')))

		expect(enterAfter(doc, '```js')[0]).toBe(false)
	})

	it('does nothing where a code block cannot go, as in the first block of a list item', () => {
		const doc = nodes.doc.create(
			null,
			nodes.bullet_list.create(null, nodes.list_item.create(null, paragraph('```js'))),
		)

		expect(enterAfter(doc, '```js')[0]).toBe(false)
	})
})
