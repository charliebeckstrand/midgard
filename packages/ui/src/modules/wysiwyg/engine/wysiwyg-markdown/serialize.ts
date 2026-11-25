import type { Mark, Node } from 'prosemirror-model'
import type { MarkdownRange } from '../../../../components/markdown/markdown-ranges'
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
	return blocks(doc, false, undefined)
}

/**
 * The two characters that mark the edges of each piece of a range while the
 * serializer writes it, and the id of each piece in the order of the output.
 * A piece is a run of text in one range. The serializer writes no text out of
 * order, so the pieces of the output are the pieces of the doc.
 *
 * @internal
 */
type RangeMarks = { open: string; close: string; ids: string[] }

/**
 * The Markdown of a doc, as {@link serializeMarkdown} gives it, and the range
 * of each `range` mark in it. A range starts at its first piece and ends after
 * its last piece. The white space at either end of a piece is not in it.
 *
 * @remarks The serializer marks the edges of each piece with two characters
 * that the doc does not hold, and then reads their offsets and removes them.
 * The marks thus move with each change that the serializer makes to a line,
 * such as the `> ` of a quote or the indent of a list item.
 * @internal
 */
export function serializeMarkdownRanges(doc: Node): {
	markdown: string
	ranges: MarkdownRange[]
} {
	const marks = rangeMarks(doc)

	if (!marks) return { markdown: serializeMarkdown(doc), ranges: [] }

	const marked = blocks(doc, false, marks)

	const spans = new Map<string, { start: number; end: number }>()

	let markdown = ''

	let piece = 0

	for (const char of marked) {
		if (char === marks.open) {
			const id = marks.ids[piece++] as string

			if (!spans.has(id)) spans.set(id, { start: markdown.length, end: markdown.length })
		} else if (char === marks.close) {
			const span = spans.get(marks.ids[piece - 1] as string)

			if (span) span.end = markdown.length
		} else {
			markdown += char
		}
	}

	const ranges = [...spans].map(([id, { start, end }]) => ({
		id,
		start,
		end,
		quote: markdown.slice(start, end),
	}))

	return { markdown, ranges }
}

/**
 * The edge marks of a doc that holds a range, or `undefined` when it holds
 * none. Each mark is a character of the private use area that no text and no
 * attribute of the doc holds.
 *
 * @internal
 */
function rangeMarks(doc: Node): RangeMarks | undefined {
	let held = false

	const used = new Set<string>()

	doc.descendants((node) => {
		if (schema.marks.range.isInSet(node.marks)) held = true

		for (const text of [
			node.text,
			...Object.values(node.attrs),
			...node.marks.flatMap((mark) => Object.values(mark.attrs)),
		]) {
			if (typeof text === 'string') for (const char of text) used.add(char)
		}
	})

	if (!held) return undefined

	const free: string[] = []

	for (let code = 0xe000; code <= 0xf8ff && free.length < 2; code++) {
		const char = String.fromCharCode(code)

		if (!used.has(char)) free.push(char)
	}

	const [open, close] = free

	return open && close ? { open, close, ids: [] } : undefined
}

/**
 * The blocks of a container, a blank line apart, or a line apart in the item of
 * a tight list.
 *
 * @internal
 */
function blocks(container: Node, tight: boolean, ranges: RangeMarks | undefined): string {
	const out: string[] = []

	// Two lists of the same kind side by side would join into one list, so the
	// second takes the other marker.
	let previous: Node | null = null

	let alternate = false

	container.forEach((node) => {
		alternate = previous?.type === node.type && isList(node) ? !alternate : false

		previous = node

		const text = block(node, alternate, ranges)

		if (text !== '') out.push(text)
	})

	return out.join(tight ? '\n' : '\n\n')
}

/** @internal */
function isList(node: Node): boolean {
	return node.type === schema.nodes.bullet_list || node.type === schema.nodes.ordered_list
}

/** @internal */
function block(node: Node, alternate: boolean, ranges: RangeMarks | undefined): string {
	switch (node.type.name) {
		case 'paragraph':
			return inline(node, ranges)
		case 'heading': {
			// A run of `#` at the end, after a space, would close the heading. The
			// edge marks of a range can sit on either side of the run.
			const edge = ranges ? `[${ranges.open}${ranges.close}]*` : ''

			const text = inline(node, ranges)
				.trimEnd()
				.replace(new RegExp(`(^|\\s)(${edge})(#+)(?=${edge}$)`), '$1$2\\$3')

			return `${'#'.repeat(node.attrs.level)} ${text}`.trimEnd()
		}
		case 'blockquote':
			return blocks(node, false, ranges)
				.split('\n')
				.map((line) => (line === '' ? '>' : `> ${line}`))
				.join('\n')
		case 'bullet_list':
			return list(node, ranges, () => (alternate ? '* ' : '- '))
		case 'ordered_list':
			return list(node, ranges, (index) => `${node.attrs.start + index}${alternate ? ')' : '.'} `)
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
function list(
	node: Node,
	ranges: RangeMarks | undefined,
	marker: (index: number) => string,
): string {
	const tight: boolean = node.attrs.tight

	const items: string[] = []

	node.forEach((item, _, index) => {
		const prefix = marker(index)

		const pad = ' '.repeat(prefix.length)

		const body = blocks(item, tight, ranges)
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

/**
 * The state of the walk over a textblock: whether the next text starts a
 * line, where a block marker would count, and the edge marks of the ranges.
 *
 * @internal
 */
type Line = { start: boolean; ranges: RangeMarks | undefined }

/**
 * The inline content of a textblock. A line break at the end of the block
 * shows nothing in a message, so it goes. White space after a line break is
 * at the start of a line, and it goes too (see `escapeText`), so a line break
 * that only white space follows is at the end of the block. Else the
 * backslash of the break would end the block, and a message would show it.
 *
 * @internal
 */
function inline(textblock: Node, ranges: RangeMarks | undefined): string {
	const items: Item[] = []

	textblock.forEach((node) => {
		items.push({ node, marks: node.marks })
	})

	for (;;) {
		let last = items.length - 1

		while (last >= 0 && isBlank(items[last]?.node)) last--

		if (items[last]?.node.type !== schema.nodes.hard_break) break

		items.length = last
	}

	return run(items, { start: true, ranges })
}

/** Whether a node is text of white space alone. @internal */
function isBlank(node: Node | undefined): boolean {
	return node?.isText === true && (node.text ?? '').trim() === ''
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

		const written = span(mark, inner, line)

		// A `!` directly before the text of a link would make the link an image.
		if (mark.type === schema.marks.link && written.startsWith('[')) {
			const bang = lastBang(out, line.ranges)

			if (bang >= 0) out = `${out.slice(0, bang)}\\${out.slice(bang)}`
		}

		out += written

		index = end
	}

	return out
}

/**
 * The offset of a `!` at the end of `out`, past the edge marks of the ranges
 * after it, or `-1`. The edge marks go before the Markdown is read, so the
 * `!` is then next to the text that follows the marks.
 *
 * @internal
 */
function lastBang(out: string, ranges: RangeMarks | undefined): number {
	let at = out.length - 1

	while (at >= 0 && ranges && (out[at] === ranges.open || out[at] === ranges.close)) at--

	return out[at] === '!' ? at : -1
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

	if (mark.type === schema.marks.range) return rangeSpan(mark, inner, line)

	const plain = inner.map((each) => each.node.text ?? '').join('')

	// A bare URL stays bare. A range on it is not a format, so it does not count.
	if (
		mark.type === schema.marks.link &&
		plain === mark.attrs.href &&
		!mark.attrs.title &&
		inner.every(
			(each) =>
				each.node.isText && each.marks.every((inside) => inside.type === schema.marks.range),
		) &&
		/^https?:\/\/[^\s<>]+$/.test(plain)
	) {
		line.start = false

		// A link is one atom.
		return atomPiece(inner, plain, line)
	}

	const open = delimiter(mark, 'open')

	const close = delimiter(mark, 'close')

	const before = line.start

	line.start = false

	const content = run(inner, line)

	const { lead, core, trail } = splitSpace(content)

	// Whitespace alone at the start of a line goes, and the line still starts after it.
	if (core === '') {
		line.start = before

		return before ? '' : content
	}

	// Whitespace at the start of a line is not text in Markdown (see `escapeText`).
	return `${before ? '' : lead}${open}${core}${close}${trail}`
}

/** The white space at the start and at the end of a text, and the text between. @internal */
function splitSpace(text: string): { lead: string; core: string; trail: string } {
	const lead = text.match(/^\s*/)?.[0] ?? ''

	const trail = text.slice(lead.length).match(/\s*$/)?.[0] ?? ''

	return { lead, core: text.slice(lead.length, text.length - trail.length), trail }
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

	// A code span is one atom.
	return atomPiece(inner, `${ticks}${pad}${code}${pad}${ticks}`, line)
}

/**
 * The written text of an atom, such as a code span. A range that holds part
 * of the atom takes all of it.
 *
 * @internal
 */
function atomPiece(inner: readonly Item[], written: string, line: Line): string {
	const range = inner.map((each) => schema.marks.range.isInSet(each.marks)).find(Boolean)

	return range ? markPiece(range, written, line) : written
}

/**
 * One piece of a range. Without edge marks, it is its content alone.
 *
 * @internal
 */
function rangeSpan(mark: Mark, inner: readonly Item[], line: Line): string {
	const content = run(inner, line)

	const { lead, core, trail } = splitSpace(content)

	return core === '' ? content : `${lead}${markPiece(mark, core, line)}${trail}`
}

/**
 * The written text of a piece of the range of `mark`, between the edge marks.
 *
 * @internal
 */
function markPiece(mark: Mark, written: string, line: Line): string {
	const { ranges } = line

	if (!ranges) return written

	ranges.ids.push(mark.attrs.id)

	return `${ranges.open}${written}${ranges.close}`
}

/**
 * Plain text with each character that would read as Markdown escaped. At the
 * start of a line, a block marker, such as `#`, `>`, `-`, `---`, or `1.`, is
 * escaped too.
 *
 * Whitespace at the start of a line goes. A message does not show it, and no
 * escape keeps it: before a marker, it lets the marker count, and four spaces
 * or a tab make a code block.
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
			.replace(/^[ \t]+/, '')
			.replace(/^>|^(#{1,6}|[+-]|-{3,}|=+)(?=\s|$)/, '\\$&')
			.replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
	}

	return out
}

/** @internal */
function isWordChar(char: string | undefined): boolean {
	return char !== undefined && /[\p{L}\p{N}]/u.test(char)
}
