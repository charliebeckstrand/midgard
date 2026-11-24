import type { Mark, Node } from 'prosemirror-model'
import { schema } from '../wysiwyg-schema'

/**
 * The Markdown of a doc, in one normal form: `**strong**`, `*em*`,
 * `~~strike~~`, `-` bullets, `1.` items, and fenced code. Text that would read
 * as syntax is escaped, so a message shows what the field shows. A `raw` atom
 * goes out as its source.
 *
 * @internal
 */
export function serializeMarkdown(doc: Node): string {
	return blocks(doc, false)
}

/**
 * The blocks of a container, a blank line apart, or a line apart in the item of
 * a tight list.
 *
 * @internal
 */
function blocks(container: Node, tight: boolean): string {
	const out: string[] = []

	// Two lists of the same kind side by side would join into one list, so the
	// second takes the other marker.
	let previous: Node | null = null

	let alternate = false

	container.forEach((node) => {
		alternate = previous?.type === node.type && isList(node) ? !alternate : false

		previous = node

		const text = block(node, alternate)

		if (text !== '') out.push(text)
	})

	return out.join(tight ? '\n' : '\n\n')
}

/** @internal */
function isList(node: Node): boolean {
	return node.type === schema.nodes.bullet_list || node.type === schema.nodes.ordered_list
}

/** @internal */
function block(node: Node, alternate: boolean): string {
	switch (node.type.name) {
		case 'paragraph':
			return inline(node)
		case 'heading': {
			// A run of `#` at the end, after a space, would close the heading.
			const text = inline(node)
				.trimEnd()
				.replace(/(^|\s)(#+)$/, '$1\\$2')

			return `${'#'.repeat(node.attrs.level)} ${text}`.trimEnd()
		}
		case 'blockquote':
			return blocks(node, false)
				.split('\n')
				.map((line) => (line === '' ? '>' : `> ${line}`))
				.join('\n')
		case 'bullet_list':
			return list(node, () => (alternate ? '* ' : '- '))
		case 'ordered_list':
			return list(node, (index) => `${node.attrs.start + index}${alternate ? ')' : '.'} `)
		case 'code_block':
			return fenced(node.textContent, node.attrs.lang)
		case 'horizontal_rule':
			// Not `---`, which under the line of a tight list item is a setext
			// underline, and not `***`, which after a `* ` marker is one rule.
			return '___'
		case 'raw':
			return node.attrs.source
		default:
			return ''
	}
}

/**
 * The items of a list. Each line after the first line of an item takes the
 * width of the marker as its indent, so it stays in the item.
 *
 * @internal
 */
function list(node: Node, marker: (index: number) => string): string {
	const tight: boolean = node.attrs.tight

	const items: string[] = []

	node.forEach((item, _, index) => {
		const prefix = marker(index)

		const pad = ' '.repeat(prefix.length)

		const body = blocks(item, tight)
			.split('\n')
			.map((line, at) => (at === 0 || line === '' ? line : pad + line))
			.join('\n')

		items.push(prefix + body)
	})

	return items.join(tight ? '\n' : '\n\n')
}

/**
 * A fenced code block. The fence is longer than each run of backticks in the
 * code, so the code cannot close it.
 *
 * @internal
 */
function fenced(code: string, lang: string): string {
	const fence = '`'.repeat(Math.max(3, longestRun(code, '`') + 1))

	return `${fence}${lang}\n${code}\n${fence}`
}

/** @internal */
function longestRun(text: string, char: string): number {
	let longest = 0

	let run = 0

	for (const c of text) {
		run = c === char ? run + 1 : 0

		longest = Math.max(longest, run)
	}

	return longest
}

/** An inline node with the marks that the walk has not yet written. @internal */
type Item = { node: Node; marks: readonly Mark[] }

/** Whether the next text starts a line, where a block marker would count. @internal */
type Line = { start: boolean }

/**
 * The inline content of a textblock. A line break at the end of the block
 * shows nothing in a message, so it goes.
 *
 * @internal
 */
function inline(textblock: Node): string {
	const items: Item[] = []

	textblock.forEach((node) => {
		items.push({ node, marks: node.marks })
	})

	while (items.at(-1)?.node.type === schema.nodes.hard_break) items.pop()

	return run(items, { start: true })
}

/**
 * The Markdown of a run of inline items. Neighbors that share their outermost
 * mark go into one span of that mark, so `**a *b***` stays one strong span.
 *
 * @internal
 */
function run(items: readonly Item[], line: Line): string {
	let out = ''

	let index = 0

	while (index < items.length) {
		const item = items[index] as Item

		const mark = item.marks[0]

		if (!mark) {
			out += leaf(item.node, line)

			index++

			continue
		}

		let end = index + 1

		while (end < items.length && items[end]?.marks[0]?.eq(mark)) end++

		const inner = items.slice(index, end).map((each) => ({ ...each, marks: each.marks.slice(1) }))

		out += span(mark, inner, line)

		index = end
	}

	return out
}

/** @internal */
function leaf(node: Node, line: Line): string {
	if (node.type === schema.nodes.hard_break) {
		line.start = true

		return '\\\n'
	}

	if (node.type === schema.nodes.raw_inline) {
		line.start = false

		return node.attrs.source
	}

	const text = escapeText(node.text ?? '', line.start)

	if (text !== '') line.start = false

	return text
}

/**
 * One span of a mark around its inner items. The whitespace at either end goes
 * outside the delimiters, because a delimiter next to a space does not open or
 * close a span.
 *
 * @internal
 */
function span(mark: Mark, inner: readonly Item[], line: Line): string {
	if (mark.type === schema.marks.code) return codeSpan(inner, line)

	const plain = inner.map((each) => each.node.text ?? '').join('')

	if (
		mark.type === schema.marks.link &&
		plain === mark.attrs.href &&
		!mark.attrs.title &&
		inner.every((each) => each.marks.length === 0 && each.node.isText) &&
		/^https?:\/\/[^\s<>]+$/.test(plain)
	) {
		line.start = false

		return plain
	}

	const open = delimiter(mark, 'open')

	const close = delimiter(mark, 'close')

	const before = line.start

	line.start = false

	const content = run(inner, line)

	const lead = content.match(/^\s*/)?.[0] ?? ''

	const trail = content.slice(lead.length).match(/\s*$/)?.[0] ?? ''

	const core = content.slice(lead.length, content.length - trail.length)

	if (core === '') {
		line.start = before && content === ''

		return content
	}

	return `${lead}${open}${core}${close}${trail}`
}

/** @internal */
function delimiter(mark: Mark, side: 'open' | 'close'): string {
	switch (mark.type.name) {
		case 'strong':
			return '**'
		case 'em':
			return '*'
		case 'strike':
			return '~~'
		case 'link': {
			if (side === 'open') return '['

			const href = /[\s()<>]/.test(mark.attrs.href) ? `<${mark.attrs.href}>` : mark.attrs.href

			const title = mark.attrs.title ? ` "${mark.attrs.title.replace(/"/g, '\\"')}"` : ''

			return `](${href}${title})`
		}
		default:
			return ''
	}
}

/**
 * A code span. Its backtick run is longer than each run in the code. A space
 * pads the code when it starts or ends with a backtick, or when it starts and
 * ends with a space, because a span strips one space from each end.
 *
 * @internal
 */
function codeSpan(inner: readonly Item[], line: Line): string {
	const code = inner.map((each) => each.node.text ?? each.node.attrs.source ?? '').join('')

	line.start = false

	if (code === '') return ''

	const ticks = '`'.repeat(longestRun(code, '`') + 1)

	const pad =
		code.startsWith('`') ||
		code.endsWith('`') ||
		(code.startsWith(' ') && code.endsWith(' ') && code.trim() !== '')
			? ' '
			: ''

	return `${ticks}${pad}${code}${pad}${ticks}`
}

/**
 * Plain text with each character that would read as Markdown escaped. At the
 * start of a line, a block marker, such as `#`, `>`, `-`, `---`, or `1.`, is
 * escaped too.
 *
 * @internal
 */
function escapeText(text: string, lineStart: boolean): string {
	let out = text
		.replace(/\n/g, ' ')
		.replace(/[\\`*[\]~]/g, '\\$&')
		.replace(/<(?=[A-Za-z/!?])/g, '\\<')
		.replace(/&(?=#?\w+;)/g, '\\&')
		// An underscore inside a word does not open emphasis, so only one at the
		// edge of a word needs the escape.
		.replace(/_/g, (match, at: number, all: string) =>
			isWordChar(all[at - 1]) && isWordChar(all[at + 1]) ? match : '\\_',
		)

	if (lineStart) {
		out = out
			.replace(/^>|^(#{1,6}|[+-]|-{3,}|=+)(?=\s|$)/, '\\$&')
			.replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
	}

	return out
}

/** @internal */
function isWordChar(char: string | undefined): boolean {
	return char !== undefined && /[\p{L}\p{N}]/u.test(char)
}
