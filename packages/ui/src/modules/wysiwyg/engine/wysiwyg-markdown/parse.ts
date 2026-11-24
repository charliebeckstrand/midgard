import type { Token, Tokens } from 'marked'
import type { Mark, Node } from 'prosemirror-model'
import { decodeEntities } from '../../../../components/markdown/markdown-entities'
import { lex } from '../../../../components/markdown/markdown-lex'
import {
	type MarkdownRange,
	overlapping,
	type RangeWalk,
	rangeWalk,
	textLines,
	within,
} from '../../../../components/markdown/markdown-ranges'
import { schema } from '../wysiwyg-schema'

/**
 * The doc of a Markdown source. It lexes with the `lex` of Markdown, so the
 * field and a message read a source in the same way. A block or an inline
 * construct that the schema does not hold becomes a `raw` or a `raw_inline`
 * atom that keeps its source, so no text goes.
 *
 * Each range that can draw on a Markdown is a `range` mark on the text that
 * it covers. The parse finds the text with the walk of the renderer of
 * Markdown, so a range covers the same text in the field and in a message. A
 * range that covers part of an atom, such as an escape, a code span, or a
 * link, takes all of it. A code block and a `raw` atom hold no mark, so a
 * range in one of them is not in the doc.
 *
 * @internal
 */
export function parseMarkdown(source: string, ranges?: readonly MarkdownRange[]): Node {
	const blocks = toBlocks(lex(source), rangeWalk(source, ranges))

	return schema.node('doc', null, blocks.length > 0 ? blocks : [schema.node('paragraph')])
}

/** @internal */
function toBlocks(tokens: readonly Token[], walk: RangeWalk | undefined): Node[] {
	const blocks: Node[] = []

	for (const token of tokens) {
		const node = within(walk, token.raw, (found) => toBlock(token, found))

		if (node) blocks.push(node)
	}

	return blocks
}

/** @internal */
function toBlock(token: Token, walk: RangeWalk | undefined): Node | null {
	switch (token.type) {
		case 'space':
		case 'def':
			return null
		case 'paragraph':
			return schema.node('paragraph', null, toInline(token.tokens ?? [], [], walk))
		// A loose line of a tight list item, which holds its inline tokens.
		case 'text':
			return schema.node(
				'paragraph',
				null,
				token.tokens ? toInline(token.tokens, [], walk) : toInline([token], [], walk),
			)
		case 'heading':
			return schema.node(
				'heading',
				{ level: token.depth },
				// A heading holds no line break.
				toInline(token.tokens ?? [], [], walk).filter(
					(node) => node.type !== schema.nodes.hard_break,
				),
			)
		case 'blockquote': {
			const content = toBlocks(token.tokens ?? [], walk)

			return schema.node(
				'blockquote',
				null,
				content.length > 0 ? content : [schema.node('paragraph')],
			)
		}
		case 'list':
			return toList(token as Tokens.List, walk)
		case 'code': {
			const code = codeLines(token.text)

			return schema.node(
				'code_block',
				{ lang: token.lang ?? '' },
				code ? schema.text(code) : undefined,
			)
		}
		case 'hr':
			return schema.node('horizontal_rule')
		default:
			return raw(token.raw)
	}
}

/**
 * A list, or a `raw` block for a task list, because the schema has no
 * checkbox.
 *
 * @internal
 */
function toList(token: Tokens.List, walk: RangeWalk | undefined): Node {
	if (token.items.some((item) => item.task)) return raw(token.raw)

	const items = token.items.map((item) => {
		const content = within(walk, item.raw, (found) => toBlocks(item.tokens, found))

		// An item opens with a paragraph, as the schema asks.
		if (content[0]?.type !== schema.nodes.paragraph) content.unshift(schema.node('paragraph'))

		return schema.node('list_item', null, content)
	})

	return token.ordered
		? schema.node(
				'ordered_list',
				{ start: typeof token.start === 'number' ? token.start : 1, tight: !token.loose },
				items,
			)
		: schema.node('bullet_list', { tight: !token.loose }, items)
}

/**
 * The lines of a code block, with a newline between two lines and none after
 * the last line, as the serializer writes them. The text that `marked` gives
 * keeps the newline at the end of the last line in some blocks, such as a
 * fenced block with a blank last line and an indented block. This removes it,
 * so a blank last line does not grow on each round trip.
 *
 * @internal
 */
function codeLines(text: string): string {
	return text.endsWith('\n') ? text.slice(0, -1) : text
}

/** @internal */
function raw(source: string): Node {
	return schema.node('raw', { source: source.replace(/\n+$/, '') })
}

/**
 * The inline nodes of `tokens` under the marks of their parents. With a walk,
 * each token is found in the source, and the text of each range gets its mark.
 *
 * @internal
 */
function toInline(
	tokens: readonly Token[],
	marks: readonly Mark[],
	walk: RangeWalk | undefined,
): Node[] {
	const nodes: Node[] = []

	for (const token of tokens) {
		nodes.push(...within(walk, token.raw, (found) => inlineToken(token, marks, found)))
	}

	return nodes
}

/**
 * The marks of the text that the walk is at, with the mark of the range that
 * overlaps the source from the cursor to `end`. A text that the walk does not
 * hold keeps `marks`.
 *
 * @internal
 */
function atomMarks(
	walk: RangeWalk | undefined,
	end: number,
	marks: readonly Mark[],
): readonly Mark[] {
	if (!walk) return marks

	return withRange(walk, overlapping(walk, walk.cursor, end)[0], marks)
}

/** The marks with the mark of the range at `index` in the walk, if any. @internal */
function withRange(
	walk: RangeWalk,
	index: number | undefined,
	marks: readonly Mark[],
): readonly Mark[] {
	const range = index === undefined ? undefined : walk.ranges[index]

	return range ? schema.marks.range.create({ id: range.id }).addToSet(marks) : marks
}

/**
 * The text of a text token with no children. A soft break shows as a space in
 * a message, so it is a space here, in the range that holds the line break.
 *
 * @internal
 */
function plainText(raw: string, marks: readonly Mark[], walk: RangeWalk | undefined): Node[] {
	if (!walk) return textNodes(decodeEntities(raw).replace(/\n/g, ' '), marks)

	const nodes: Node[] = []

	let previous = -1

	textLines(walk, raw).forEach((pieces, row) => {
		if (row > 0) {
			const gap = previous === -1 ? undefined : overlapping(walk, previous, previous + 1)[0]

			nodes.push(...textNodes(' ', withRange(walk, gap, marks)))
		}

		for (const piece of pieces) {
			nodes.push(...textNodes(decodeEntities(piece.text), withRange(walk, piece.range, marks)))
		}

		previous = pieces.at(-1)?.end ?? -1
	})

	return nodes
}

/** A text node, or none for an empty text. @internal */
function textNodes(text: string, marks: readonly Mark[]): Node[] {
	return text ? [schema.text(text, marks)] : []
}

/** The inline nodes of one token. @internal */
function inlineToken(token: Token, marks: readonly Mark[], walk: RangeWalk | undefined): Node[] {
	const end = walk ? walk.limit : 0

	switch (token.type) {
		case 'text':
			return token.tokens ? toInline(token.tokens, marks, walk) : plainText(token.raw, marks, walk)
		case 'escape':
			return textNodes(token.text, atomMarks(walk, end, marks))
		case 'strong':
			return toInline(token.tokens ?? [], schema.marks.strong.create().addToSet(marks), walk)
		case 'em':
			return toInline(token.tokens ?? [], schema.marks.em.create().addToSet(marks), walk)
		case 'del':
			return toInline(token.tokens ?? [], schema.marks.strike.create().addToSet(marks), walk)
		case 'codespan':
			return textNodes(token.text, atomMarks(walk, end, schema.marks.code.create().addToSet(marks)))
		case 'link': {
			const link = schema.marks.link.create({
				href: decodeEntities(token.href),
				title: token.title ? decodeEntities(token.title) : null,
			})

			// The text of a link is one atom, as a message names it.
			return toInline(token.tokens ?? [], atomMarks(walk, end, link.addToSet(marks)), undefined)
		}
		case 'br':
			return [schema.node('hard_break', null, undefined, atomMarks(walk, end, []))]
		default:
			return [schema.node('raw_inline', { source: token.raw }, undefined, atomMarks(walk, end, []))]
	}
}
