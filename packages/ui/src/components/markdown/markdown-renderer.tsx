import type { Token, Tokens } from 'marked'
import { Fragment, type ReactNode } from 'react'
import type { BundledLanguage } from 'shiki'
import { k } from '../../recipes/kata/markdown'
import { clamp } from '../../utilities/clamp'
import { Code, CodeBlock } from '../code'
import { decodeEntities } from './markdown-entities'
import {
	atomRange,
	locate,
	type MarkdownRange,
	type MarkdownRangePiece,
	type RangeWalk,
	rangeWalk,
	segmentLine,
} from './markdown-ranges'
import { MarkdownTableScroll } from './markdown-table-scroll'

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

/** The number of levels that a heading in Markdown source moves down the outline of the page. */
export type MarkdownHeadingOffset = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Draws one piece of a range. `children` is the text of the piece, in the
 * inline elements that hold it.
 */
export type MarkdownRangeRenderer<R extends MarkdownRange = MarkdownRange> = (
	piece: MarkdownRangePiece<R>,
	children: ReactNode,
) => ReactNode

/**
 * A walk that draws ranges, with the renderer of their pieces.
 *
 * @internal
 */
type Draw = RangeWalk & { render: MarkdownRangeRenderer }

/**
 * The piece that a {@link MarkdownRenderer} draws when the caller gives no
 * `renderRange`.
 *
 * @internal
 */
function defaultRangeRenderer({ range }: MarkdownRangePiece, children: ReactNode): ReactNode {
	return (
		<span data-slot="markdown-range" data-range={range.id}>
			{children}
		</span>
	)
}

const SAFE_URL_SCHEMES = /^(?:https?|mailto|tel)$/i

/**
 * A lexed URL cleared to render as an `href`/`src`. Relative, root-relative,
 * anchor, and protocol-relative URLs pass through; an absolute URL passes only
 * on a known-safe scheme: http/https/mailto/tel, plus `data:` for images.
 * Untrusted Markdown can carry `javascript:`, `data:text/html`, or `vbscript:`
 * URLs that run script when the link is clicked. Those resolve to `undefined`,
 * and no `href`/`src` renders. Entity references in the URL decode first.
 *
 * @internal
 */
function safeUrl(source: string, allowData = false): string | undefined {
	// The scheme check reads the decoded URL, so `&#106;avascript:` is blocked
	// as `javascript:`. The decoded URL is also what renders.
	const url = decodeEntities(source)

	// The URL parser strips every leading C0 control and space (code point
	// <= 0x20), plus tab/newline anywhere, when resolving a scheme, so
	// `javascript:` and `java\tscript:` both become `javascript:` at click
	// time. Drop that whole set before classifying the scheme: a `\s` strip
	// misses the non-whitespace C0 controls (U+0000–U+0008, U+000E–U+001F)
	// the browser still trims, so a leading control byte would hide a blocked
	// scheme. The original `url` is what renders; this cleaned copy only
	// classifies.
	const scheme = [...url]
		.filter((char) => char.charCodeAt(0) > 0x20)
		.join('')
		.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]

	// The strip walks the whole URL to read a ~4-character scheme, which is
	// O(payload) on a large `data:` image. Left alone deliberately: the obvious
	// scheme-bounded rewrite drops the leading-whitespace defense and readmits
	// `" javascript:"`, which browsers trim and run. A slow correct guard beats a
	// fast porous one on an uncommon path.
	if (scheme === undefined) return url

	if (allowData && scheme.toLowerCase() === 'data') return url

	return SAFE_URL_SCHEMES.test(scheme) ? url : undefined
}

/**
 * Render a flat list of marked tokens (block or inline) to React nodes,
 * recursing through each token's inline children.
 *
 * @remarks
 * Pure and hook-free itself, so the {@link Markdown} leaf that mounts it stays
 * static and server-renderable. A fenced code token renders through
 * {@link CodeBlock} (a `'use client'` leaf that lazily syntax-highlights), and
 * a table renders in {@link MarkdownTableScroll} (a `'use client'` scroll box).
 * A tree with code or a table therefore gets a client boundary there, and the
 * rest stays static. Raw HTML tokens render nothing: the tree
 * is built only from elements this renderer controls, so source markup never
 * reaches the DOM.
 *
 * marked decodes only the numeric references in a text token, and keeps the
 * other entity references as source text. The renderer decodes text from the
 * source of the token, so that each reference is decoded one time. It decodes
 * text, image `alt`, titles, and link and image destinations, as CommonMark
 * specifies, with the subset of names that {@link decodeEntities} knows. A
 * destination decodes before its scheme check, so `&#106;avascript:` is
 * blocked as `javascript:`. The decoded text goes into React text nodes and
 * attributes, so a decoded `<` shows as a character and is never markup. Code
 * spans and code blocks keep their references literal.
 *
 * A heading takes the level of its source depth plus `headingOffset`, in the
 * range 1 to 6. Its look stays that of its source depth.
 *
 * With `source` and `ranges`, each range that can draw goes through
 * `renderRange`. The renderer finds each text token in the source with a
 * cursor that moves forward, and cuts the text at the edges of each range. A
 * piece holds only text, in the innermost inline element that holds the text,
 * so a range that crosses bold or a paragraph break draws as more than one
 * piece. A piece does not go into a link, a fenced code block, or an image
 * `alt`. An escape and a code span do not split. With no range, the walk does
 * not occur.
 *
 * @param tokens - Token list from `marked`'s block lexer or inline lexer.
 * @param headingOffset - The number of levels to add to each heading.
 * @param source - The source that `tokens` came from. The ranges address it.
 * @param ranges - The ranges to draw.
 * @param renderRange - Draws one piece of a range.
 */
export function MarkdownRenderer({
	tokens,
	headingOffset = 0,
	source,
	ranges,
	renderRange,
}: {
	tokens: Token[]
	headingOffset?: MarkdownHeadingOffset
	source?: string
	ranges?: readonly MarkdownRange[]
	renderRange?: MarkdownRangeRenderer
}) {
	const walk = source === undefined ? undefined : rangeWalk(source, ranges)

	const draw = walk && { ...walk, render: renderRange ?? defaultRangeRenderer }

	return <>{renderChildren(tokens, headingOffset, undefined, draw)}</>
}

/**
 * Renders a token list. A heading can be in a blockquote or in a list item, so
 * each level of the tree takes the heading offset. A `taskLabel` reaches the
 * checkbox of a GFM task item, through the paragraph that holds it in a loose
 * item. A nested list does not get it.
 *
 * @internal
 */
function renderChildren(
	tokens: Token[] | undefined,
	offset: number,
	taskLabel?: string,
	draw?: Draw,
): ReactNode {
	return tokens?.map((token, index) => renderToken(token, index, offset, taskLabel, draw))
}

/**
 * Renders one token. With a walk, the cursor moves to the start of the token
 * before its children render, and past its end after. A token that the source
 * does not hold renders with no ranges, and the cursor stays.
 *
 * @internal
 */
function renderToken(
	token: Token,
	index: number,
	offset: number,
	taskLabel?: string,
	draw?: Draw,
): ReactNode {
	// A render with no ranges takes the plain path, with no closure for each token.
	if (!draw) return renderTokenAt(token, index, offset, taskLabel, undefined)

	return within(draw, token.raw, (found) => renderTokenAt(token, index, offset, taskLabel, found))
}

/**
 * Runs `render` with the cursor of the walk at the start of `raw` in the
 * source, then moves the cursor past the end of `raw`.
 *
 * @internal
 */
function within(
	draw: Draw | undefined,
	raw: string,
	render: (draw: Draw | undefined) => ReactNode,
): ReactNode {
	if (!draw) return render(undefined)

	const span = locate(draw, raw)

	if (!span) return render(undefined)

	draw.cursor = span[0]

	const node = render(draw)

	draw.cursor = Math.max(draw.cursor, span[1])

	return node
}

/**
 * Draws one piece of the range at `range` in the walk.
 *
 * @internal
 */
function drawPiece(draw: Draw, range: number, key: number, children: ReactNode): ReactNode {
	const index = draw.pieces[range] ?? 0

	draw.pieces[range] = index + 1

	return (
		<Fragment key={key}>
			{draw.render({ range: draw.ranges[range] as MarkdownRange, index }, children)}
		</Fragment>
	)
}

/**
 * The text of a text token, with each range that it overlaps drawn as a
 * piece. Each line is found in the source on its own, because a token in a
 * list item or a blockquote has no indentation. After a line that the source
 * does not hold, the rest of the token renders with no ranges.
 *
 * @internal
 */
function markText(draw: Draw, raw: string, key: number): ReactNode {
	const nodes: ReactNode[] = []

	let found = true

	raw.split('\n').forEach((line, row) => {
		if (row > 0) nodes.push('\n')

		const at = found && line !== '' ? draw.source.indexOf(line, draw.cursor) : -1

		if (at === -1) {
			if (line !== '') found = false

			nodes.push(decodeEntities(line))

			return
		}

		for (const segment of segmentLine(draw, line, at)) {
			const text = decodeEntities(segment.text)

			nodes.push(
				segment.range === undefined ? text : drawPiece(draw, segment.range, nodes.length, text),
			)
		}

		draw.cursor = at + line.length
	})

	return <Fragment key={key}>{nodes}</Fragment>
}

/**
 * The text of a token that does not split, such as an escape: a piece when a
 * range overlaps its source, or the text alone.
 *
 * @internal
 */
function markAtom(draw: Draw | undefined, raw: string, text: string): ReactNode {
	const range = draw && atomRange(draw, raw.length)

	return draw && range !== undefined ? drawPiece(draw, range, 0, text) : text
}

function renderTokenAt(
	token: Token,
	index: number,
	offset: number,
	taskLabel: string | undefined,
	draw: Draw | undefined,
): ReactNode {
	switch (token.type) {
		case 'heading': {
			const depth = clamp(token.depth, 1, 6) as 1 | 2 | 3 | 4 | 5 | 6

			// The offset moves the level in the outline of the page. The look stays
			// that of the source depth.
			const Tag = HEADING_TAGS[clamp(depth + offset, 1, 6) - 1] ?? 'h1'

			return (
				<Tag key={index} className={k({ level: depth }).heading}>
					{renderChildren(token.tokens, offset, undefined, draw)}
				</Tag>
			)
		}
		case 'paragraph':
			return (
				<p key={index} className={k().paragraph}>
					{renderChildren(token.tokens, offset, taskLabel, draw)}
				</p>
			)
		case 'text':
			if (token.tokens) {
				return (
					<Fragment key={index}>{renderChildren(token.tokens, offset, undefined, draw)}</Fragment>
				)
			}

			return draw ? markText(draw, token.raw, index) : decodeEntities(token.raw)
		case 'strong':
			return (
				<strong key={index} className={k().strong}>
					{renderChildren(token.tokens, offset, undefined, draw)}
				</strong>
			)
		case 'em':
			return (
				<em key={index} className={k().em}>
					{renderChildren(token.tokens, offset, undefined, draw)}
				</em>
			)
		case 'del':
			return (
				<del key={index} className={k().del}>
					{renderChildren(token.tokens, offset, undefined, draw)}
				</del>
			)
		// A link renders its text with no walk. A piece in a link would put a
		// second control in the link, and the link already acts. The cursor moves
		// past the whole link in `within`.
		case 'link':
			return (
				<a
					key={index}
					href={safeUrl(token.href)}
					title={decodeTitle(token.title)}
					className={k().link}
				>
					{renderChildren(token.tokens, offset)}
				</a>
			)
		case 'image':
			return (
				<img
					key={index}
					src={safeUrl(token.href, true)}
					alt={imageAlt(token)}
					title={decodeTitle(token.title)}
					className={k().img}
				/>
			)
		case 'codespan':
			return (
				<Code key={index} size="sm">
					{markAtom(draw, token.raw, token.text)}
				</Code>
			)
		case 'code':
			return <CodeBlock key={index} code={token.text} lang={resolveLang(token.lang)} />
		case 'blockquote':
			return (
				<blockquote key={index} className={k().blockquote}>
					{renderChildren(token.tokens, offset, undefined, draw)}
				</blockquote>
			)
		case 'list':
			return renderList(token as Tokens.List, index, offset, draw)
		case 'checkbox':
			// The checkbox cannot be in a `<label>`, because a loose item holds
			// paragraphs and nested lists. The plain text of the item names it.
			return (
				<input
					key={index}
					type="checkbox"
					checked={token.checked}
					disabled
					readOnly
					aria-label={taskLabel}
					className={k().checkbox}
				/>
			)
		case 'table':
			return renderTable(token as Tokens.Table, index, offset, draw)
		case 'hr':
			return <hr key={index} className={k().hr} />
		case 'br':
			return <br key={index} />
		case 'escape':
			return <Fragment key={index}>{markAtom(draw, token.raw, token.text)}</Fragment>
		// Raw HTML, whitespace, and link definitions render nothing.
		default:
			return null
	}
}

/**
 * The text of a link or image title, with its entity references decoded.
 *
 * @internal
 */
function decodeTitle(title: string | null | undefined): string | undefined {
	return title ? decodeEntities(title) : undefined
}

/**
 * The `alt` of an image: the plain text of its parsed description, so that
 * emphasis and escapes do not go into the accessible name. A token with no
 * children gives its raw `text`, with its entity references decoded.
 *
 * @internal
 */
function imageAlt(token: Tokens.Image | Tokens.Generic): string {
	return token.tokens ? plainText(token.tokens) : decodeEntities(token.text)
}

function renderList(token: Tokens.List, key: number, offset: number, draw?: Draw): ReactNode {
	const items = token.items.map((item, index) =>
		draw
			? within(draw, item.raw, (found) => renderListItem(item, index, offset, found))
			: renderListItem(item, index, offset),
	)

	if (token.ordered) {
		const start = typeof token.start === 'number' && token.start !== 1 ? token.start : undefined

		return (
			<ol key={key} className={k().ol} start={start}>
				{items}
			</ol>
		)
	}

	return (
		<ul key={key} className={k().ul}>
			{items}
		</ul>
	)
}

function renderListItem(
	item: Tokens.ListItem,
	index: number,
	offset: number,
	draw?: Draw,
): ReactNode {
	return (
		<li key={index} className={k({ task: item.task }).li}>
			{renderChildren(item.tokens, offset, item.task ? taskLabel(item.tokens) : undefined, draw)}
		</li>
	)
}

/**
 * The accessible name of a task item: the plain text of its first block after
 * the checkbox. In a loose item, the checkbox is in that block. A nested list
 * or a second paragraph is not part of the name. Returns `undefined` for an
 * item with no text.
 *
 * @internal
 */
function taskLabel(tokens: Token[]): string | undefined {
	const first = tokens.find((token) => token.type !== 'checkbox' && token.type !== 'space')

	return (first ? plainText([first]).trim() : '') || undefined
}

/**
 * The text of a token tree, with no markup. It decodes entity references as
 * the renderer does, takes the `alt` of an image, and reads a line break as a
 * space.
 *
 * @internal
 */
function plainText(tokens: Token[]): string {
	return tokens
		.map((token) => {
			switch (token.type) {
				case 'codespan':
				case 'escape':
					return token.text
				case 'image':
					return imageAlt(token)
				case 'br':
					return ' '
				default:
					if ('tokens' in token && token.tokens) return plainText(token.tokens)

					return token.type === 'text' ? decodeEntities(token.raw) : ''
			}
		})
		.join('')
}

function renderTable(token: Tokens.Table, key: number, offset: number, draw?: Draw): ReactNode {
	return (
		<MarkdownTableScroll key={key}>
			<table className={k().table.base}>
				<thead>
					<tr>{token.header.map((cell, index) => renderCell('th', cell, index, offset, draw))}</tr>
				</thead>
				<tbody>{token.rows.map((row, index) => renderRow(row, index, offset, draw))}</tbody>
			</table>
		</MarkdownTableScroll>
	)
}

function renderRow(row: Tokens.TableCell[], index: number, offset: number, draw?: Draw): ReactNode {
	return (
		<tr key={index}>{row.map((cell, column) => renderCell('td', cell, column, offset, draw))}</tr>
	)
}

/** Renders one table cell: a `th` in the head, a `td` in the body. */
function renderCell(
	Cell: 'th' | 'td',
	cell: Tokens.TableCell,
	index: number,
	offset: number,
	draw?: Draw,
): ReactNode {
	// A cell has no `raw`. Its trimmed text is the nearest form of its source.
	return (
		<Cell key={index} className={k({ align: cell.align ?? undefined })[Cell]}>
			{draw
				? within(draw, cell.text, (found) => renderChildren(cell.tokens, offset, undefined, found))
				: renderChildren(cell.tokens, offset)}
		</Cell>
	)
}

/**
 * Resolve a fenced code block's info string to a Shiki grammar id. That is its
 * first word, since info strings carry extra metadata (a filename, say) after
 * the language. An unlabeled fence resolves to `'text'`, Shiki's built-in
 * no-highlight grammar. An id Shiki doesn't bundle still renders: {@link CodeBlock}
 * falls back to plain text rather than throwing.
 */
function resolveLang(lang: string | undefined): BundledLanguage {
	return (lang?.trim().split(/\s+/, 1)[0] || 'text') as BundledLanguage
}
