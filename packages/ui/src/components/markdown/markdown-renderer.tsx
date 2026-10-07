import type { ClassValue } from 'clsx'
import type { Token, Tokens } from 'marked'
import { Fragment, type ReactNode } from 'react'
import type { BundledLanguage } from 'shiki'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { clamp } from '../../utilities'
import { Code, CodeBlock } from '../code'
import { decodeEntities } from './markdown-entities'

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

/** The number of levels that a heading in Markdown source moves down the outline of the page. */
export type MarkdownHeadingOffset = 0 | 1 | 2 | 3 | 4 | 5

const SAFE_URL_SCHEMES = /^(?:https?|mailto|tel)$/i

/**
 * A lexed URL cleared to render as an `href`/`src`. Relative, root-relative,
 * anchor, and protocol-relative URLs pass through; an absolute URL passes only
 * on a known-safe scheme — http/https/mailto/tel, plus `data:` for images.
 * Untrusted Markdown can carry `javascript:`, `data:text/html`, or `vbscript:`
 * URLs that run script when the link is clicked. Those resolve to `undefined`,
 * and no `href`/`src` renders.
 *
 * @internal
 */
function safeUrl(url: string, allowData = false): string | undefined {
	// The URL parser strips every leading C0 control and space (code point
	// <= 0x20), plus tab/newline anywhere, when resolving a scheme — so
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
 * Render a flat list of marked tokens — block or inline — to React nodes,
 * recursing through each token's inline children.
 *
 * @remarks
 * Pure and hook-free itself, so the {@link Markdown} leaf that mounts it stays
 * static and server-renderable. A fenced code token is the one exception,
 * rendered through {@link CodeBlock} (a `'use client'` leaf that lazily
 * syntax-highlights). A code-bearing tree therefore picks up one client boundary
 * there, while the rest stays static. Raw HTML tokens render nothing: the tree
 * is built only from elements this renderer controls, so source markup never
 * reaches the DOM.
 *
 * marked decodes only the numeric references in a text token, and keeps the
 * other entity references as source text. The renderer decodes text from the
 * source of the token, so that each reference is decoded one time. It decodes
 * text, image `alt`, and titles, as CommonMark specifies, with the subset of
 * names that {@link decodeEntities} knows. The
 * decoded text goes into React text nodes and attributes, so a decoded `<`
 * shows as a character and is never markup. Code spans and code blocks keep
 * their references literal.
 *
 * A heading takes the level of its source depth plus `headingOffset`, in the
 * range 1 to 6. Its look stays that of its source depth.
 *
 * @param tokens - Token list from `marked`'s block lexer or inline lexer.
 * @param headingOffset - The number of levels to add to each heading.
 */
export function MarkdownRenderer({
	tokens,
	headingOffset = 0,
}: {
	tokens: Token[]
	headingOffset?: MarkdownHeadingOffset
}) {
	return <>{renderChildren(tokens, headingOffset)}</>
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
): ReactNode {
	return tokens?.map((token, index) => renderToken(token, index, offset, taskLabel))
}

function renderToken(token: Token, index: number, offset: number, taskLabel?: string): ReactNode {
	switch (token.type) {
		case 'heading': {
			const depth = clamp(token.depth, 1, 6) as 1 | 2 | 3 | 4 | 5 | 6

			// The offset moves the level in the outline of the page. The look stays
			// that of the source depth.
			const Tag = HEADING_TAGS[clamp(depth + offset, 1, 6) - 1] ?? 'h1'

			return (
				<Tag key={index} className={cn(k.heading[depth])}>
					{renderChildren(token.tokens, offset)}
				</Tag>
			)
		}
		case 'paragraph':
			return (
				<p key={index} className={cn(k.paragraph)}>
					{renderChildren(token.tokens, offset, taskLabel)}
				</p>
			)
		case 'text':
			return token.tokens ? (
				<Fragment key={index}>{renderChildren(token.tokens, offset)}</Fragment>
			) : (
				decodeEntities(token.raw)
			)
		case 'strong':
			return (
				<strong key={index} className={cn(k.strong)}>
					{renderChildren(token.tokens, offset)}
				</strong>
			)
		case 'em':
			return (
				<em key={index} className={cn(k.em)}>
					{renderChildren(token.tokens, offset)}
				</em>
			)
		case 'del':
			return (
				<del key={index} className={cn(k.del)}>
					{renderChildren(token.tokens, offset)}
				</del>
			)
		case 'link':
			return (
				<a
					key={index}
					href={safeUrl(token.href)}
					title={decodeTitle(token.title)}
					className={cn(k.link)}
				>
					{renderChildren(token.tokens, offset)}
				</a>
			)
		case 'image':
			return (
				<img
					key={index}
					src={safeUrl(token.href, true)}
					alt={decodeEntities(token.text)}
					title={decodeTitle(token.title)}
					className={cn(k.img)}
				/>
			)
		case 'codespan':
			return (
				<Code key={index} size="sm">
					{token.text}
				</Code>
			)
		case 'code':
			return <CodeBlock key={index} code={token.text} lang={resolveLang(token.lang)} />
		case 'blockquote':
			return (
				<blockquote key={index} className={cn(k.blockquote)}>
					{renderChildren(token.tokens, offset)}
				</blockquote>
			)
		case 'list':
			return renderList(token as Tokens.List, index, offset)
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
					className={cn(k.checkbox)}
				/>
			)
		case 'table':
			return renderTable(token as Tokens.Table, index, offset)
		case 'hr':
			return <hr key={index} className={cn(k.hr)} />
		case 'br':
			return <br key={index} />
		case 'escape':
			return token.text
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

function renderList(token: Tokens.List, key: number, offset: number): ReactNode {
	const items = token.items.map((item, index) => renderListItem(item, index, offset))

	if (token.ordered) {
		const start = typeof token.start === 'number' && token.start !== 1 ? token.start : undefined

		return (
			<ol key={key} className={cn(k.ol)} start={start}>
				{items}
			</ol>
		)
	}

	return (
		<ul key={key} className={cn(k.ul)}>
			{items}
		</ul>
	)
}

function renderListItem(item: Tokens.ListItem, index: number, offset: number): ReactNode {
	return (
		<li key={index} className={cn(k.li, item.task && k.task)}>
			{renderChildren(item.tokens, offset, item.task ? taskLabel(item.tokens) : undefined)}
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
					return decodeEntities(token.text)
				case 'br':
					return ' '
				default:
					if ('tokens' in token && token.tokens) return plainText(token.tokens)

					return token.type === 'text' ? decodeEntities(token.raw) : ''
			}
		})
		.join('')
}

/**
 * Renders a table. A header row of empty cells, such as `| | |`, is the form of
 * a table with no header, because GFM needs a header row. That table renders
 * no `thead`, so no empty row shows above the rows.
 */
function renderTable(token: Tokens.Table, key: number, offset: number): ReactNode {
	const header = token.header.some((cell) => cell.text.trim() !== '')

	return (
		<table key={key} className={cn(k.table)}>
			{header && (
				<thead>
					<tr>{token.header.map((cell, index) => renderCell('th', k.th, cell, index, offset))}</tr>
				</thead>
			)}
			<tbody>{token.rows.map((row, index) => renderRow(row, index, offset))}</tbody>
		</table>
	)
}

function renderRow(row: Tokens.TableCell[], index: number, offset: number): ReactNode {
	return (
		<tr key={index}>{row.map((cell, column) => renderCell('td', k.td, cell, column, offset))}</tr>
	)
}

/** Renders one table cell: a `th` in the head, a `td` in the body. */
function renderCell(
	Cell: 'th' | 'td',
	className: ClassValue,
	cell: Tokens.TableCell,
	index: number,
	offset: number,
): ReactNode {
	return (
		<Cell key={index} className={cn(className, alignClass(cell.align))}>
			{renderChildren(cell.tokens, offset)}
		</Cell>
	)
}

function alignClass(align: Tokens.TableCell['align']): string | undefined {
	return align ? k.align[align] : undefined
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
