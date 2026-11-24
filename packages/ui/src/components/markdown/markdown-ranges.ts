import type { Token } from 'marked'
import { REFERENCE } from './markdown-entities'

/**
 * A range of the Markdown source that a {@link Markdown} draws through its
 * `renderRange`, such as the phrase that a citation points to.
 *
 * @remarks
 * The offsets are UTF-16 offsets into the source string, as `String.slice`
 * reads them. `quote` is the exact source that the range covers, syntax
 * included. The renderer draws a range only while
 * `source.slice(start, end) === quote`. Thus a range stays correct while
 * its text streams in: a range that arrives before its text draws when the
 * text arrives, and a range whose text changes does not draw.
 */
export type MarkdownRange = {
	/** Names the range. A {@link MarkdownRangePiece} carries the range back to the caller. */
	id: string
	/** The offset of the first character of the range. */
	start: number
	/** The offset after the last character of the range. */
	end: number
	/** The source between `start` and `end`. */
	quote: string
}

/**
 * One piece of a {@link MarkdownRange}, as `renderRange` gets it. A range in
 * one block that holds each inline element that it touches whole, such as
 * `**4** to **14**`, draws as one piece around those elements. A range that
 * crosses a block boundary, ends inside an inline element, or holds a link
 * draws as more than one piece.
 */
export type MarkdownRangePiece<R extends MarkdownRange = MarkdownRange> = {
	/** The range that the caller gave, as the same object. */
	range: R
	/**
	 * The position of this piece in its range, from 0. A caller that draws a
	 * control draws it on piece 0, so that one range is one tab stop.
	 */
	index: number
}

/**
 * The state of one render that draws ranges. The cursor moves forward through
 * the source as the renderer walks the tokens.
 *
 * @internal
 */
export type RangeWalk<R extends MarkdownRange = MarkdownRange> = {
	source: string
	cursor: number
	/**
	 * The end of the token that holds the cursor. A search does not accept a
	 * match past it, because marked rewrites the text of some tokens, such as
	 * `\|` to `|` in a table cell. A match past the token is then text of a
	 * later token.
	 */
	limit: number
	/** The ranges that draw, sorted by `start`, with no overlap. */
	ranges: R[]
	/** The number of pieces that each range in `ranges` drew so far. */
	pieces: number[]
}

/**
 * One part of a line of text: plain text, or text in a range. `text` is
 * source text. The renderer decodes it.
 *
 * @internal
 */
export type RangeSegment = { text: string; range?: number }

/**
 * A walk over `source` for the ranges that can draw, or `undefined` when no
 * range can. A range draws when `start < end`, its quote matches the source,
 * and it does not overlap a range before it. The ranges sort by `start`, and
 * the longer one comes first when two start together. Thus the outer range of
 * two nested ranges draws.
 *
 * @internal
 */
export function rangeWalk<R extends MarkdownRange>(
	source: string,
	ranges: readonly R[] | undefined,
): RangeWalk<R> | undefined {
	if (!ranges?.length) return undefined

	const sorted = ranges
		.filter(
			(range) =>
				range.start >= 0 &&
				range.start < range.end &&
				source.slice(range.start, range.end) === range.quote,
		)
		.sort((a, b) => a.start - b.start || b.end - a.end)

	const accepted: R[] = []

	for (const range of sorted) {
		const last = accepted.at(-1)

		if (!last || range.start >= last.end) accepted.push(range)
	}

	if (accepted.length === 0) return undefined

	return {
		source,
		cursor: 0,
		limit: source.length,
		ranges: accepted,
		pieces: accepted.map(() => 0),
	}
}

/**
 * The offset of `text` in the source from `from`, or `-1` when the source
 * holds it only past the limit of the walk, or not at all.
 *
 * @internal
 */
export function find(walk: RangeWalk, text: string, from: number): number {
	const at = walk.source.indexOf(text, from)

	return at === -1 || at + text.length > walk.limit ? -1 : at
}

/**
 * The source span of a token, found from the cursor, or `undefined` when the
 * source does not hold it. A token in a list item or a blockquote holds
 * text with no indentation and no `>` marker, so a token of more than one line
 * is found by its first line and its last line. Trailing line breaks hold no
 * text, and the search ignores them.
 *
 * @internal
 */
export function locate(walk: RangeWalk, raw: string): [number, number] | undefined {
	const text = raw.replace(/\n+$/, '')

	if (text === '') return undefined

	const lineEnd = text.indexOf('\n')

	if (lineEnd === -1) {
		const at = find(walk, text, walk.cursor)

		return at === -1 ? undefined : [at, at + text.length]
	}

	const first = text.slice(0, lineEnd)

	const last = text.slice(text.lastIndexOf('\n') + 1)

	const at = find(walk, first, walk.cursor)

	if (at === -1) return undefined

	const lastAt = find(walk, last, at + first.length)

	return [at, lastAt === -1 ? at + first.length : lastAt + last.length]
}

/**
 * The ranges of the walk that overlap the source span from `start` to `end`,
 * as indexes into `walk.ranges`.
 *
 * @internal
 */
export function overlapping(walk: RangeWalk, start: number, end: number): number[] {
	const found: number[] = []

	walk.ranges.forEach((range, index) => {
		if (range.start < end && range.end > start) found.push(index)
	})

	return found
}

/**
 * The index of the range that an atom at the cursor overlaps, such as an
 * escape or a code span. An atom does not split. A range that covers part of
 * it takes all of it.
 *
 * @internal
 */
export function atomRange(walk: RangeWalk, length: number): number | undefined {
	return overlapping(walk, walk.cursor, walk.cursor + length)[0]
}

/**
 * A cut in `line` moved out of an entity reference, so that the reference
 * decodes whole. `outward` is `-1` for the start of a range and `1` for its
 * end.
 *
 * @internal
 */
export function snapCut(line: string, cut: number, outward: -1 | 1): number {
	for (const match of line.matchAll(REFERENCE)) {
		const start = match.index

		const end = start + match[0].length

		if (cut > start && cut < end) return outward === -1 ? start : end
	}

	return cut
}

/**
 * One line of a text token, at source offset `at`, cut into segments at the
 * edges of each range that it overlaps.
 *
 * @internal
 */
export function segmentLine(walk: RangeWalk, line: string, at: number): RangeSegment[] {
	const segments: RangeSegment[] = []

	let done = 0

	for (const index of overlapping(walk, at, at + line.length)) {
		const range = walk.ranges[index] as MarkdownRange

		const start = Math.max(done, snapCut(line, Math.max(range.start - at, 0), -1))

		const end = Math.max(start, snapCut(line, Math.min(range.end - at, line.length), 1))

		if (start > done) segments.push({ text: line.slice(done, start) })

		if (end > start) segments.push({ text: line.slice(start, end), range: index })

		done = end
	}

	if (done < line.length) segments.push({ text: line.slice(done) })

	return segments
}

/**
 * Runs `run` with the cursor of the walk at the start of `raw` in the source,
 * then moves the cursor past the end of `raw`. While `run` runs, the limit of
 * the walk is the end of `raw`, so a child token is found only in the source
 * of its parent. A token that the source does not hold runs with no walk, and
 * the cursor stays.
 *
 * @internal
 */
export function within<W extends RangeWalk, T>(
	walk: W | undefined,
	raw: string,
	run: (walk: W | undefined) => T,
): T {
	if (!walk) return run(undefined)

	const span = locate(walk, raw)

	if (!span) return run(undefined)

	const limit = walk.limit

	walk.cursor = span[0]

	walk.limit = span[1]

	const result = run(walk)

	walk.limit = limit

	walk.cursor = Math.max(walk.cursor, span[1])

	return result
}

/**
 * One part of a line of a text token: source text, its source span, and the
 * index of its range in `walk.ranges`. A line that the source does not hold
 * is one piece with no span, at `-1`.
 *
 * @internal
 */
export type TextPiece = { text: string; start: number; end: number; range?: number }

/**
 * The lines of a text token, each cut into pieces at the edges of each range
 * that it overlaps. Each line is found in the source on its own, because a
 * token in a list item or a blockquote has no indentation. After a line that
 * the source does not hold, each line is one piece with no range.
 *
 * @internal
 */
export function textLines(walk: RangeWalk, raw: string): TextPiece[][] {
	let found = true

	return raw.split('\n').map((line) => {
		const at = found && line !== '' ? find(walk, line, walk.cursor) : -1

		if (at === -1) {
			if (line !== '') found = false

			return [{ text: line, start: -1, end: -1 }]
		}

		let start = at

		const pieces = segmentLine(walk, line, at).map((segment) => {
			const end = start + segment.text.length

			const piece: TextPiece = { text: segment.text, start, end, range: segment.range }

			start = end

			return piece
		})

		walk.cursor = at + line.length

		return pieces
	})
}

/**
 * The inline tokens that one piece can hold whole. A link is not one, because
 * a piece in a link would put a second control in the link.
 */
const WRAPPABLE = new Set(['text', 'strong', 'em', 'del', 'codespan', 'escape', 'br'])

/** The inline tokens that a block holds, the link and the image included. */
const INLINE = new Set([...WRAPPABLE, 'link', 'image'])

/** Whether a token is plain text with no child tokens, which a cut can split. */
function isPlainText(token: Token): boolean {
	return token.type === 'text' && !('tokens' in token && token.tokens?.length)
}

/** Whether a token is inline. A `text` token with child tokens holds a block of a list item. */
function isInline(token: Token): boolean {
	return INLINE.has(token.type) && (token.type !== 'text' || isPlainText(token))
}

/**
 * A run of the inline tokens of one block that one range holds, as one piece.
 * The first and the last token can be parts of a text token that the edges of
 * the range cut.
 *
 * @internal
 */
export type RangeGroup = { range: number; tokens: Token[] }

/**
 * Whether an item of {@link groupInline} is a group. A token always has a
 * `type`, and a group has none.
 *
 * @internal
 */
export function isRangeGroup(item: Token | RangeGroup): item is RangeGroup {
	return !('type' in item)
}

/**
 * The text token `token` at source offset `at`, cut at source offset `cut`
 * into the part before and the part after. Returns `undefined` when the raw
 * text of the token is not the source at `at`, or when the cut is in an entity
 * reference, so that the cut cannot keep the text whole.
 */
function cutText(
	walk: RangeWalk,
	token: Token,
	at: number,
	cut: number,
): [Token, Token] | undefined {
	const { raw } = token

	const offset = cut - at

	if (walk.source.slice(at, at + raw.length) !== raw) return undefined

	if (snapCut(raw, offset, -1) !== offset) return undefined

	const part = (text: string) => ({ ...token, raw: text, text }) as Token

	return [part(raw.slice(0, offset)), part(raw.slice(offset))]
}

/**
 * The source span of each token from the cursor, or `undefined` when the
 * source does not hold one. The cursor of the walk does not move.
 */
function locateAll(walk: RangeWalk, tokens: Token[]): [number, number][] | undefined {
	const cursor = walk.cursor

	const spans: [number, number][] = []

	for (const token of tokens) {
		const span = locate(walk, token.raw)

		if (!span) break

		spans.push(span)

		walk.cursor = span[1]
	}

	walk.cursor = cursor

	return spans.length === tokens.length ? spans : undefined
}

/**
 * The parts of a token at its source span, cut at source offset `at`: the
 * part before and the part after. A cut at an edge of the span gives the token
 * whole on one side. A cut inside the span needs plain text, and gives
 * `undefined` for any other token.
 */
function cutAt(
	walk: RangeWalk,
	token: Token,
	[start, end]: [number, number],
	at: number,
): [Token | undefined, Token | undefined] | undefined {
	if (at === start) return [undefined, token]

	if (at === end) return [token, undefined]

	return isPlainText(token) ? cutText(walk, token, start, at) : undefined
}

/** A range that groups: the tokens that it takes, and its group with the cut parts beside it. */
type Grouping = { head: number; tail: number; items: (Token | RangeGroup)[] }

/**
 * The grouping of the range at `index` in the walk, or `undefined` when the
 * range does not group in `tokens`. The range must start at or after the token
 * `from`, hold more than one token, hold only tokens that a piece can hold, and
 * have edges that are token edges or cuts in plain text.
 */
function groupRange(
	walk: RangeWalk,
	tokens: Token[],
	spans: [number, number][],
	index: number,
	from: number,
): Grouping | undefined {
	const range = walk.ranges[index] as MarkdownRange

	const head = spans.findIndex(([start, end]) => range.start >= start && range.start < end)

	const tail = spans.findIndex(([start, end]) => range.end > start && range.end <= end)

	if (head < from || tail <= head) return undefined

	if (!tokens.slice(head, tail + 1).every((token) => WRAPPABLE.has(token.type))) return undefined

	const opening = cutAt(walk, tokens[head] as Token, spans[head] as [number, number], range.start)

	const closing = cutAt(walk, tokens[tail] as Token, spans[tail] as [number, number], range.end)

	if (!opening || !closing) return undefined

	const group: RangeGroup = {
		range: index,
		tokens: [opening[1] as Token, ...tokens.slice(head + 1, tail), closing[0] as Token],
	}

	const items = [opening[0], group, closing[1]].filter((item) => item !== undefined)

	return { head, tail, items }
}

/**
 * The inline tokens of one block, with each range that holds a run of more
 * than one of them whole as a {@link RangeGroup}. A text token at an edge of
 * such a range is cut, and the part in the range goes into the group. The
 * renderer draws a group as one piece around its tokens, so one piece holds
 * `**4** to **14**`, and the bold stays inside it.
 *
 * A range that ends inside a token other than plain text, holds a link, or
 * shares a cut text token with a group before it does not group. It draws as
 * pieces of text. A block token list does not group, so a piece never holds a
 * block.
 *
 * The cursor of the walk does not move.
 *
 * @internal
 */
export function groupInline(walk: RangeWalk, tokens: Token[]): (Token | RangeGroup)[] {
	if (tokens.length < 2 || !tokens.every(isInline)) return tokens

	const spans = locateAll(walk, tokens)

	if (!spans) return tokens

	const output: (Token | RangeGroup)[] = []

	// The index of the next token that `output` does not hold yet.
	let next = 0

	for (const index of overlapping(walk, spans[0]?.[0] ?? 0, spans.at(-1)?.[1] ?? 0)) {
		const grouping = groupRange(walk, tokens, spans, index, next)

		if (!grouping) continue

		output.push(...tokens.slice(next, grouping.head), ...grouping.items)

		next = grouping.tail + 1
	}

	output.push(...tokens.slice(next))

	return output
}
