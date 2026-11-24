import { DOMParser, DOMSerializer } from 'prosemirror-model'
import { describe, expect, it } from 'vitest'
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
})
