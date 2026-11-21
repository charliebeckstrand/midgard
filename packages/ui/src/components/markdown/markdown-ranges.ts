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
 * One piece of a {@link MarkdownRange}, as `renderRange` gets it. A range
 * that crosses inline formatting or a block boundary draws as more than one
 * piece.
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
function overlapping(walk: RangeWalk, start: number, end: number): number[] {
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
function snapCut(line: string, cut: number, outward: -1 | 1): number {
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
