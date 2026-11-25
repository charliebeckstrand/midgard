// @vitest-environment node

import { Node } from 'prosemirror-model'
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
		'`foo`\\\n`bar`',
		'a &amp; b',
		'see https://example.com. And (https://example.com/a_(b)), https://example.com?',
		'<https://example.com>x and <https://example.com.>',
		'<https://example.com>\\\nline two',
		'[a](<x\\>y>) and [b](x\\\\y "ends in \\\\") and [c](x&amp;amp;y "&amp;amp; \\"q\\"")',
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

	describe('a bare URL', () => {
		const url = 'https://example.com'

		const link = (href: string) => schema.marks.link.create({ href })

		const paragraph = (...content: Node[]) =>
			schema.node('doc', null, [schema.node('paragraph', null, content)])

		it.each([
			['a letter after it', paragraph(schema.text(url, [link(url)]), schema.text('x'))],
			['a backslash after it', paragraph(schema.text(url, [link(url)]), schema.text('\\'))],
			[
				'a line break after it',
				paragraph(schema.text(url, [link(url)]), schema.node('hard_break'), schema.text('b')),
			],
			[
				'a code span after it',
				paragraph(schema.text(url, [link(url)]), schema.text(' x', [schema.marks.code.create()])),
			],
			['a period at its end', paragraph(schema.text(`${url}.`, [link(`${url}.`)]))],
			['a question mark at its end', paragraph(schema.text(`${url}?`, [link(`${url}?`)]))],
			['a parenthesis at its end', paragraph(schema.text(`${url})`, [link(`${url})`)]))],
			['a web address before it', paragraph(schema.text('www.'), schema.text(url, [link(url)]))],
			['a reference in it', paragraph(schema.text(`${url}/?a&amp;b`, [link(`${url}/?a&amp;b`)]))],
		])('keeps its link with %s', (_, doc) => {
			expect(parseMarkdown(serializeMarkdown(doc)).eq(doc)).toBe(true)
		})

		// The text of an email address reads as a link of its own. That is not
		// this rule, so only the link of the URL counts.
		it('keeps its link with an email address before it', () => {
			const doc = paragraph(schema.text('a@b.c'), schema.text(url, [link(url)]))

			const hrefs: string[] = []

			parseMarkdown(serializeMarkdown(doc)).descendants((node) => {
				if (node.text === url) hrefs.push(...node.marks.map((mark) => mark.attrs.href))
			})

			expect(hrefs).toEqual([url])
		})

		it('stays bare where it reads back as the same link', () => {
			const source = `see ${url}. Or ${url}, ${url}! Or (${url})`

			expect(roundTrip(source)).toBe(source)
		})

		it('takes angle brackets where the text after it would join it', () => {
			expect(serializeMarkdown(paragraph(schema.text(url, [link(url)]), schema.text('x')))).toBe(
				`<${url}>x`,
			)
		})
	})

	it.each([
		['an angle bracket in the destination', 'a>b', null],
		['an opening angle bracket in the destination', 'a<b', null],
		['a backslash in the destination', 'a\\*b', null],
		['a backslash and a space in the destination', 'a b\\', null],
		['a reference in the destination', 'a&amp;b', null],
		['a backslash at the end of the title', 'a', 'b\\'],
		['quotes in the title', 'a', 'say "hi"'],
		['a reference in the title', 'a', 'a &amp; b'],
	])('keeps a link with %s', (_, href, title) => {
		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [
				schema.text('x', [schema.marks.link.create({ href, title })]),
			]),
		])

		expect(parseMarkdown(serializeMarkdown(doc)).eq(doc)).toBe(true)
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

	describe('a line break in a code span', () => {
		const code = schema.marks.code.create()

		const strong = schema.marks.strong.create()

		it.each([
			['code alone', [code], '`foo`\\\n`bar`'],
			['code in bold', [strong, code], '**`foo`\\\n`bar`**'],
		])('ends the span, so the line stays: %s', (_, marks, markdown) => {
			const doc = schema.node('doc', null, [
				schema.node('paragraph', null, [
					schema.text('foo', marks),
					schema.node('hard_break', null, undefined, marks),
					schema.text('bar', marks),
				]),
			])

			expect(serializeMarkdown(doc)).toBe(markdown)

			expect(shape(serializeMarkdown(doc))).toContain('<br/>')
		})

		it('reads back as the code on each line', () => {
			const doc = schema.node('doc', null, [
				schema.node('paragraph', null, [
					schema.text('foo', [code]),
					schema.node('hard_break', null, undefined, [code]),
					schema.text('bar', [code]),
				]),
			])

			const read = parseMarkdown(serializeMarkdown(doc))

			expect(read.firstChild?.childCount).toBe(3)
			expect(read.firstChild?.child(0).marks).toEqual([code])
			expect(read.firstChild?.child(1).type).toBe(schema.nodes.hard_break)
			expect(read.firstChild?.child(2).marks).toEqual([code])
		})

		it('drops a span that holds only the break', () => {
			const doc = schema.node('doc', null, [
				schema.node('paragraph', null, [
					schema.text('foo'),
					schema.node('hard_break', null, undefined, [code]),
					schema.text('bar'),
				]),
			])

			expect(serializeMarkdown(doc)).toBe('foo\\\nbar')
		})
	})

	it('writes a list that two docs share with the marker of its place in each', () => {
		const item = (text: string) =>
			schema.node('list_item', null, [schema.node('paragraph', null, [schema.text(text)])])

		const shared = schema.node('bullet_list', null, [item('b')])

		expect(serializeMarkdown(schema.node('doc', null, [shared]))).toBe('- b')

		const after = schema.node('doc', null, [schema.node('bullet_list', null, [item('a')]), shared])

		expect(serializeMarkdown(after)).toBe('- a\n\n* b')
	})

	it('writes the doc of an edit as it writes a copy of the doc', () => {
		const doc = parseMarkdown(sources.join('\n\n'))

		serializeMarkdown(doc)

		// An edit in the first block. The doc after it keeps each other block.
		const edited = doc.replace(1, 1, doc.slice(1, 3))

		// A copy has new nodes, so it shares no block with the docs above.
		const copy = Node.fromJSON(schema, edited.toJSON())

		expect(serializeMarkdown(edited)).toBe(serializeMarkdown(copy))
	})

	it('drops a line break that only white space follows, so no backslash ends the paragraph', () => {
		const doc = schema.node('doc', null, [
			schema.node('paragraph', null, [
				schema.text('a'),
				schema.node('hard_break'),
				schema.text(' \t'),
				schema.node('hard_break'),
				schema.text(' ', [schema.marks.strong.create()]),
			]),
		])

		expect(serializeMarkdown(doc)).toBe('a')
	})
})
