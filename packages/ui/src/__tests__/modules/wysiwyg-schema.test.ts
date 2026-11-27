import { DOMParser, DOMSerializer } from 'prosemirror-model'
import { describe, expect, it } from 'vitest'
import { markDOM, nodeDOM, textblockTypes } from '../../modules/wysiwyg/engine/wysiwyg-dom'
import { parseMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/parse'
import { serializeMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/serialize'
import { schema } from '../../modules/wysiwyg/engine/wysiwyg-schema'

/**
 * The doc after a trip through the DOM, as a copy and a paste, or a drag, in
 * the field moves its content.
 */
function throughDOM(markdown: string): string {
	const host = document.createElement('div')

	host.append(DOMSerializer.fromSchema(schema).serializeFragment(parseMarkdown(markdown).content))

	return serializeMarkdown(DOMParser.fromSchema(schema).parse(host))
}

describe('wysiwyg schema', () => {
	it.each([
		['a block', '| a |\n| --- |\n| b |'],
		['an inline construct', 'an ![image](https://example.com/a.png) inline'],
	])('keeps the source of %s that the schema does not hold across the DOM', (_, markdown) => {
		expect(throughDOM(markdown)).toBe(markdown)
	})

	it.each([
		['a tight bullet list', '- a\n- b'],
		['a loose bullet list', '- a\n\n- b'],
		['a tight ordered list', '3. a\n4. b'],
		['a loose ordered list', '3. a\n\n4. b'],
		['a code block with a language', '```ts\nconst a = 1\n```'],
		['a code block with no language', '```\nconst a = 1\n```'],
	])('keeps %s across the DOM', (_, markdown) => {
		expect(throughDOM(markdown)).toBe(markdown)
	})

	it('reads a list from outside the field as tight', () => {
		const host = document.createElement('div')

		host.innerHTML = '<ul><li><p>a</p></li><li><p>b</p></li></ul>'

		expect(serializeMarkdown(DOMParser.fromSchema(schema).parse(host))).toBe('- a\n- b')
	})

	it('reads a Google Docs paste as its own bold, not as bold in whole', () => {
		// Google Docs wraps the HTML of a copy in a `b` that is not bold, and marks
		// each run with its own weight.
		const host = document.createElement('div')

		host.innerHTML =
			'<b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr">' +
			'<span style="font-weight:400;">plain </span><span style="font-weight:700;">bold</span>' +
			'</p></b>'

		expect(serializeMarkdown(DOMParser.fromSchema(schema).parse(host))).toBe('plain **bold**')
	})

	it('has the markup and the mark order of the markup before the editor loads', () => {
		const types = Object.values(schema.nodes).filter((type) => type.name !== 'doc' && !type.isText)

		expect(types.map((type) => type.name).sort()).toEqual(Object.keys(nodeDOM).sort())

		expect(
			types
				.filter((type) => type.isTextblock)
				.map((type) => type.name)
				.sort(),
		).toEqual([...textblockTypes].sort())

		expect(Object.keys(schema.marks)).toEqual(Object.keys(markDOM))
	})
})
