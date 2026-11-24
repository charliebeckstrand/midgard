import type { Token, Tokens } from 'marked'
import { decodeEntities } from '../../components/markdown/markdown-entities'
import { lex } from '../../components/markdown/markdown-lex'
import {
	type MarkdownRange,
	overlapping,
	type RangeWalk,
	rangeWalk,
	textLines,
	within,
} from '../../components/markdown/markdown-ranges'
import { markDOM } from './wysiwyg-dom'

/**
 * A mark of a {@link WysiwygDocNode}, in the JSON form of a ProseMirror mark.
 *
 * @internal
 */
export type WysiwygDocMark = { type: string; attrs?: Record<string, unknown> }

/**
 * A node of the doc of a Markdown source, in the JSON form of a ProseMirror
 * node. The engine makes the doc of the editor from it, and the markup before
 * the editor loads draws it, so neither reads the source in its own way.
 *
 * @internal
 */
export type WysiwygDocNode = {
	type: string
	attrs?: Record<string, unknown>
	content?: WysiwygDocNode[]
	marks?: WysiwygDocMark[]
	text?: string
}

/** The marks of a text, in the order of the schema. @internal */
type Marks = readonly WysiwygDocMark[]

/** The rank of each mark type: the order of the schema, outermost first. @internal */
const MARK_RANK = new Map(Object.keys(markDOM).map((type, rank) => [type, rank]))

/**
 * The marks with `mark` in the place of its rank. A mark replaces a mark of
 * its type, as `Mark.addToSet` of ProseMirror does.
 *
 * @internal
 */
function addMark(marks: Marks, mark: WysiwygDocMark): Marks {
	const rank = (each: WysiwygDocMark) => MARK_RANK.get(each.type) ?? 0

	return [...marks.filter((each) => each.type !== mark.type), mark].sort(
		(a, b) => rank(a) - rank(b),
	)
}

/** A node with no empty `content` and no empty `marks`. @internal */
function node(
	type: string,
	attrs?: Record<string, unknown>,
	content?: readonly WysiwygDocNode[],
	marks?: Marks,
): WysiwygDocNode {
	return {
		type,
		...(attrs ? { attrs } : {}),
		...(content && content.length > 0 ? { content: [...content] } : {}),
		...(marks && marks.length > 0 ? { marks: [...marks] } : {}),
	}
}

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
 * @remarks The doc is plain data, and this module imports no ProseMirror, so
 * the markup before the editor loads draws it with no engine.
 * @internal
 */
export function markdownDoc(source: string, ranges?: readonly MarkdownRange[]): WysiwygDocNode {
	const blocks = toBlocks(lex(source), rangeWalk(source, ranges))

	return node('doc', undefined, blocks.length > 0 ? blocks : [node('paragraph')])
}

/**
 * Whether a doc is empty: one paragraph with no content. The field then shows
 * its placeholder.
 *
 * @internal
 */
export function isEmptyDocJSON(doc: WysiwygDocNode): boolean {
	const [first, ...rest] = doc.content ?? []

	return rest.length === 0 && first?.type === 'paragraph' && first.content === undefined
}

/** @internal */
function toBlocks(tokens: readonly Token[], walk: RangeWalk | undefined): WysiwygDocNode[] {
	const blocks: WysiwygDocNode[] = []

	for (const token of tokens) {
		const block = within(walk, token.raw, (found) => toBlock(token, found))

		if (block) blocks.push(block)
	}

	return blocks
}

/** @internal */
function toBlock(token: Token, walk: RangeWalk | undefined): WysiwygDocNode | null {
	switch (token.type) {
		case 'space':
		case 'def':
			return null
		case 'paragraph':
			return node('paragraph', undefined, toInline(token.tokens ?? [], [], walk))
		// A loose line of a tight list item, which holds its inline tokens.
		case 'text':
			return node('paragraph', undefined, toInline(token.tokens ?? [token], [], walk))
		case 'heading':
			return node(
				'heading',
				{ level: token.depth },
				// A heading holds no line break.
				toInline(token.tokens ?? [], [], walk).filter((inline) => inline.type !== 'hard_break'),
			)
		case 'blockquote': {
			const content = toBlocks(token.tokens ?? [], walk)

			return node('blockquote', undefined, content.length > 0 ? content : [node('paragraph')])
		}
		case 'list':
			return toList(token as Tokens.List, walk)
		case 'code': {
			const code = codeLines(token.text)

			return node(
				'code_block',
				{ lang: token.lang ?? '' },
				code ? [{ type: 'text', text: code }] : undefined,
			)
		}
		case 'hr':
			return node('horizontal_rule')
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
function toList(token: Tokens.List, walk: RangeWalk | undefined): WysiwygDocNode {
	if (token.items.some((item) => item.task)) return raw(token.raw)

	const items = token.items.map((item) => {
		const content = within(walk, item.raw, (found) => toBlocks(item.tokens, found))

		// An item opens with a paragraph, as the schema asks.
		if (content[0]?.type !== 'paragraph') content.unshift(node('paragraph'))

		return node('list_item', undefined, content)
	})

	return token.ordered
		? node(
				'ordered_list',
				{ start: typeof token.start === 'number' ? token.start : 1, tight: !token.loose },
				items,
			)
		: node('bullet_list', { tight: !token.loose }, items)
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
function raw(source: string): WysiwygDocNode {
	return node('raw', { source: source.replace(/\n+$/, '') })
}

/**
 * The inline nodes of `tokens` under the marks of their parents. With a walk,
 * each token is found in the source, and the text of each range gets its mark.
 *
 * @internal
 */
function toInline(
	tokens: readonly Token[],
	marks: Marks,
	walk: RangeWalk | undefined,
): WysiwygDocNode[] {
	const nodes: WysiwygDocNode[] = []

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
function atomMarks(walk: RangeWalk | undefined, end: number, marks: Marks): Marks {
	if (!walk) return marks

	return withRange(walk, overlapping(walk, walk.cursor, end)[0], marks)
}

/** The marks with the mark of the range at `index` in the walk, if any. @internal */
function withRange(walk: RangeWalk, index: number | undefined, marks: Marks): Marks {
	const range = index === undefined ? undefined : walk.ranges[index]

	return range ? addMark(marks, { type: 'range', attrs: { id: range.id } }) : marks
}

/**
 * The text of a text token with no children. A soft break shows as a space in
 * a message, so it is a space here, in the range that holds the line break.
 *
 * @internal
 */
function plainText(raw: string, marks: Marks, walk: RangeWalk | undefined): WysiwygDocNode[] {
	if (!walk) return textNodes(decodeEntities(raw).replace(/\n/g, ' '), marks)

	const nodes: WysiwygDocNode[] = []

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
function textNodes(text: string, marks: Marks): WysiwygDocNode[] {
	return text ? [{ ...node('text', undefined, undefined, marks), text }] : []
}

/** The inline nodes of one token. @internal */
function inlineToken(token: Token, marks: Marks, walk: RangeWalk | undefined): WysiwygDocNode[] {
	const end = walk ? walk.limit : 0

	switch (token.type) {
		case 'text':
			return token.tokens ? toInline(token.tokens, marks, walk) : plainText(token.raw, marks, walk)
		case 'escape':
			return textNodes(token.text, atomMarks(walk, end, marks))
		case 'strong':
			return toInline(token.tokens ?? [], addMark(marks, { type: 'strong' }), walk)
		case 'em':
			return toInline(token.tokens ?? [], addMark(marks, { type: 'em' }), walk)
		case 'del':
			return toInline(token.tokens ?? [], addMark(marks, { type: 'strike' }), walk)
		case 'codespan':
			return textNodes(token.text, atomMarks(walk, end, addMark(marks, { type: 'code' })))
		case 'link': {
			const link = {
				type: 'link',
				attrs: {
					href: decodeEntities(token.href),
					title: token.title ? decodeEntities(token.title) : null,
				},
			}

			// The text of a link is one atom, as a message names it.
			return toInline(token.tokens ?? [], atomMarks(walk, end, addMark(marks, link)), undefined)
		}
		case 'br':
			return [node('hard_break', undefined, undefined, atomMarks(walk, end, []))]
		default:
			return [node('raw_inline', { source: token.raw }, undefined, atomMarks(walk, end, []))]
	}
}
