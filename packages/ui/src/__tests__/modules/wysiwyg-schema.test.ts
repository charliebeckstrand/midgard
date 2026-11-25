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
