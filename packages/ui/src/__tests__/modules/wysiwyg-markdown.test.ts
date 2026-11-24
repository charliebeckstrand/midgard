// @vitest-environment node

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Markdown } from '../../components/markdown'
import { parseMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/parse'
import { serializeMarkdown } from '../../modules/wysiwyg/engine/wysiwyg-markdown/serialize'
import { schema } from '../../modules/wysiwyg/engine/wysiwyg-schema'

const roundTrip = (source: string) => serializeMarkdown(parseMarkdown(source))

/** The HTML that a message renders from a source. */
const shape = (source: string) => renderToStaticMarkup(createElement(Markdown, null, source))

describe('wysiwyg markdown', () => {
	const sources = [
		'',
		'plain text',
		'**bold** and *italic* and ~~strike~~ and `code`',
		'***both*** and **a *b* c**',
		'[link](https://example.com "Title") and https://example.com',
		'line one\\\nline two',
		'# Heading\n\nText',
		'> a quote\n>\n> two',
		'- one\n- two\n  - nested',
		'1. one\n2. two',
		'3. starts at three',
		'- loose\n\n- items',
		'```ts\nconst a = 1\n```',
		'```\na\n\n```',
		'```\n\n\n```',
		'    a\n\n    b\n',
		'---',
		'- a\n  ***',
		'- a\n\n* ---',
		'# Ticket \\#',
		'| a |\n| --- |\n| b |',
		'- [ ] a task',
		'an ![image](https://example.com/a.png) inline',
		'text with <b>html</b>',
		'snake_case and _em_ and 2 * 3 and a [bracket] and ~tilde',
		'# not a heading',
		'1. not a list',
		'`` code with ` tick ``',
		'a &amp; b',
	]

	it.each(sources)('renders %j as the source does', (source) => {
		expect(shape(roundTrip(source))).toEqual(shape(source))
	})

	it.each(sources)('reaches a fixed point for %j', (source) => {
		const once = roundTrip(source)

		expect(roundTrip(once)).toBe(once)
	})

	it('writes one normal form', () => {
		expect(roundTrip('__bold__ _em_\n\n* item')).toBe('**bold** *em*\n\n- item')
	})

	it('keeps a run of `#` at the end of a heading as text', () => {
		const doc = schema.node('doc', null, [
			schema.node('heading', { level: 1 }, [schema.text('Ticket #')]),
		])

		const markdown = serializeMarkdown(doc)

		expect(markdown).toBe('# Ticket \\#')

		expect(parseMarkdown(markdown).eq(doc)).toBe(true)
	})

	it('writes a rule that no list item reads as a heading or as its marker', () => {
		expect(roundTrip('- a\n  ***')).toBe('- a\n  ___')

		expect(roundTrip('- a\n\n* ---')).toBe('- a\n\n* ___')
	})

	it('escapes text that would read as syntax', () => {
		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [schema.text('# 1. *not* [syntax] _x_ snake_case')]),
			schema.node('paragraph', null, [schema.text('> no quote')]),
			schema.node('paragraph', null, [schema.text('1. no list')]),
		])

		const markdown = serializeMarkdown(doc)

		expect(markdown).toBe(
			'\\# 1. \\*not\\* \\[syntax\\] \\_x\\_ snake_case\n\n\\> no quote\n\n1\\. no list',
		)

		expect(parseMarkdown(markdown).eq(doc)).toBe(true)
	})

	it('keeps a bang before a link as text, so the link is not an image', () => {
		const link = schema.marks.link.create({ href: 'https://example.com' })

		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [schema.text('Look!'), schema.text('here', [link])]),
		])

		const markdown = serializeMarkdown(doc)

		expect(markdown).toBe('Look\\![here](https://example.com)')

		expect(parseMarkdown(markdown).eq(doc)).toBe(true)
	})

	it.each([
		['a space before a heading marker', ' # no heading'],
		['three spaces before a quote marker', '   > no quote'],
		['four spaces', '    no code'],
		['a tab', '\tno code'],
	])('writes a paragraph that starts with %s as a paragraph', (_, text) => {
		const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text(text)])])

		expect(parseMarkdown(serializeMarkdown(doc)).firstChild?.type).toBe(schema.nodes.paragraph)

		expect(parseMarkdown(serializeMarkdown(doc)).textContent).toBe(text.trimStart())
	})

	it('drops a mark of whitespace alone at the start of a line', () => {
		const strong = schema.marks.strong.create()

		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [schema.text('  ', [strong]), schema.text('  # a')]),
		])

		expect(serializeMarkdown(doc)).toBe('\\# a')
	})

	it('moves the whitespace at the ends of a mark outside its delimiters', () => {
		const strong = schema.marks.strong.create()

		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [
				schema.text('a'),
				schema.text(' bold ', [strong]),
				schema.text('b'),
			]),
		])

		expect(serializeMarkdown(doc)).toBe('a **bold** b')
	})

	it('keeps two lists of one kind apart', () => {
		const item = (text: string) =>
			schema.node('list_item', null, [schema.node('paragraph', null, [schema.text(text)])])

		const doc = schema.node('doc', null, [
			schema.node('bullet_list', null, [item('a')]),
			schema.node('bullet_list', null, [item('b')]),
		])

		expect(parseMarkdown(serializeMarkdown(doc)).eq(doc)).toBe(true)
	})

	it.each([
		['a blank last line', '```\na\n\n```', 'a\n'],
		['one blank line', '```\n\n```', ''],
		['two blank lines', '```\n\n\n```', '\n'],
		['an indented block', '    a\n\n    b\n', 'a\n\nb'],
	])('holds the lines of a code block with %s', (_, source, code) => {
		expect(parseMarkdown(source).firstChild?.textContent).toBe(code)
	})

	it('drops a line break at the end of a paragraph', () => {
		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [schema.text('a'), schema.node('hard_break')]),
		])

		expect(serializeMarkdown(doc)).toBe('a')
	})
})
