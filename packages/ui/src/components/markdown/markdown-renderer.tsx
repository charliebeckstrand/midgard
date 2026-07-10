import type { Token, Tokens } from 'marked'
import { Fragment, type ReactNode } from 'react'
import type { BundledLanguage } from 'shiki'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { Code, CodeBlock } from '../code'

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

/**
 * A fenced-code override for {@link Markdown}: called for every fenced code
 * block with its body and the info string's first word (`undefined` for an
 * unlabeled fence). Return a node to render in the fence's place, or
 * `undefined` to fall through to the default syntax-highlighted
 * {@link CodeBlock} — so one language can be claimed (a `chart` spec, a
 * diagram DSL) while every other fence keeps the stock rendering.
 */
export type MarkdownFence = (code: string, lang: string | undefined) => ReactNode | undefined

/**
 * Render a flat list of marked tokens — block or inline — to React nodes,
 * recursing through each token's inline children.
 *
 * @remarks
 * Pure and hook-free itself, so the {@link Markdown} leaf that mounts it stays
 * static and server-renderable; a fenced code token is the one exception,
 * rendered through {@link CodeBlock} (a `'use client'` leaf that lazily
 * syntax-highlights), so a code-bearing tree picks up one client boundary
 * there while the rest stays static. Raw HTML tokens render nothing: the tree
 * is built only from elements this renderer controls, so source markup never
 * reaches the DOM.
 *
 * @param tokens - Token list from `marked`'s block lexer or inline lexer.
 * @param fence - Optional fenced-code override; see {@link MarkdownFence}.
 */
export function MarkdownRenderer({ tokens, fence }: { tokens: Token[]; fence?: MarkdownFence }) {
	return <>{tokens.map((token, index) => renderToken(token, index, fence))}</>
}

function renderChildren(tokens: Token[] | undefined, fence?: MarkdownFence): ReactNode {
	return tokens?.map((token, index) => renderToken(token, index, fence))
}

function renderToken(token: Token, index: number, fence?: MarkdownFence): ReactNode {
	switch (token.type) {
		case 'heading': {
			const depth = Math.min(Math.max(token.depth, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6

			const Tag = HEADING_TAGS[depth - 1] ?? 'h1'

			return (
				<Tag key={index} className={cn(k.heading[depth])}>
					{renderChildren(token.tokens, fence)}
				</Tag>
			)
		}
		case 'paragraph':
			return (
				<p key={index} className={cn(k.paragraph)}>
					{renderChildren(token.tokens, fence)}
				</p>
			)
		case 'text':
			return token.tokens ? (
				<Fragment key={index}>{renderChildren(token.tokens, fence)}</Fragment>
			) : (
				token.text
			)
		case 'strong':
			return (
				<strong key={index} className={cn(k.strong)}>
					{renderChildren(token.tokens, fence)}
				</strong>
			)
		case 'em':
			return (
				<em key={index} className={cn(k.em)}>
					{renderChildren(token.tokens, fence)}
				</em>
			)
		case 'del':
			return (
				<del key={index} className={cn(k.del)}>
					{renderChildren(token.tokens, fence)}
				</del>
			)
		case 'link':
			return (
				<a key={index} href={token.href} title={token.title ?? undefined} className={cn(k.link)}>
					{renderChildren(token.tokens, fence)}
				</a>
			)
		case 'image':
			return (
				<img
					key={index}
					src={token.href}
					alt={token.text}
					title={token.title ?? undefined}
					className={cn(k.img)}
				/>
			)
		case 'codespan':
			return (
				<Code key={index} size="sm">
					{token.text}
				</Code>
			)
		case 'code': {
			const override = fence?.(token.text, fenceLang(token.lang))

			if (override !== undefined) return <Fragment key={index}>{override}</Fragment>

			return <CodeBlock key={index} code={token.text} lang={resolveLang(token.lang)} />
		}
		case 'blockquote':
			return (
				<blockquote key={index} className={cn(k.blockquote)}>
					{renderChildren(token.tokens, fence)}
				</blockquote>
			)
		case 'list':
			return renderList(token as Tokens.List, index, fence)
		case 'checkbox':
			return (
				<input
					key={index}
					type="checkbox"
					checked={token.checked}
					disabled
					readOnly
					className={cn(k.checkbox)}
				/>
			)
		case 'table':
			return renderTable(token as Tokens.Table, index)
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

function renderList(token: Tokens.List, key: number, fence?: MarkdownFence): ReactNode {
	const items = token.items.map((item, index) => renderListItem(item, index, fence))

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

function renderListItem(item: Tokens.ListItem, index: number, fence?: MarkdownFence): ReactNode {
	return (
		<li key={index} className={cn(k.li, item.task && k.task)}>
			{renderChildren(item.tokens, fence)}
		</li>
	)
}

function renderTable(token: Tokens.Table, key: number): ReactNode {
	return (
		<table key={key} className={cn(k.table)}>
			<thead>
				<tr>
					{token.header.map((cell, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: column order is the stable identity
						<th key={i} className={cn(k.th, alignClass(cell.align))}>
							{renderChildren(cell.tokens)}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{token.rows.map((row, r) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: row order is the stable identity
					<tr key={r}>
						{row.map((cell, c) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: column order is the stable identity
							<td key={c} className={cn(k.td, alignClass(cell.align))}>
								{renderChildren(cell.tokens)}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}

function alignClass(align: Tokens.TableCell['align']): string | undefined {
	return align ? k.align[align] : undefined
}

/**
 * A fence info string's first word (info strings carry extra metadata, e.g. a
 * filename, after the language), or `undefined` for an unlabeled fence — the
 * language identity a {@link MarkdownFence} override matches on.
 */
function fenceLang(lang: string | undefined): string | undefined {
	return lang?.trim().split(/\s+/, 1)[0] || undefined
}

/**
 * Resolve a fenced code block's info string to a Shiki grammar id: its first
 * word (see {@link fenceLang}), or `'text'` — Shiki's built-in no-highlight
 * grammar — for an unlabeled fence. An id Shiki doesn't bundle still renders:
 * {@link CodeBlock} falls back to plain text rather than throwing.
 */
function resolveLang(lang: string | undefined): BundledLanguage {
	return (fenceLang(lang) ?? 'text') as BundledLanguage
}
