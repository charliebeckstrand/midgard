import type { Token, Tokens } from 'marked'
import { Fragment, type ReactNode } from 'react'
import type { BundledLanguage } from 'shiki'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { Code, CodeBlock } from '../code'

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

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
 */
export function MarkdownRenderer({ tokens }: { tokens: Token[] }) {
	return <>{tokens.map(renderToken)}</>
}

function renderChildren(tokens: Token[] | undefined): ReactNode {
	return tokens?.map(renderToken)
}

function renderToken(token: Token, index: number): ReactNode {
	switch (token.type) {
		case 'heading': {
			const depth = Math.min(Math.max(token.depth, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6

			const Tag = HEADING_TAGS[depth - 1] ?? 'h1'

			return (
				<Tag key={index} className={cn(k.heading[depth])}>
					{renderChildren(token.tokens)}
				</Tag>
			)
		}
		case 'paragraph':
			return (
				<p key={index} className={cn(k.paragraph)}>
					{renderChildren(token.tokens)}
				</p>
			)
		case 'text':
			return token.tokens ? (
				<Fragment key={index}>{renderChildren(token.tokens)}</Fragment>
			) : (
				token.text
			)
		case 'strong':
			return (
				<strong key={index} className={cn(k.strong)}>
					{renderChildren(token.tokens)}
				</strong>
			)
		case 'em':
			return (
				<em key={index} className={cn(k.em)}>
					{renderChildren(token.tokens)}
				</em>
			)
		case 'del':
			return (
				<del key={index} className={cn(k.del)}>
					{renderChildren(token.tokens)}
				</del>
			)
		case 'link':
			return (
				<a key={index} href={token.href} title={token.title ?? undefined} className={cn(k.link)}>
					{renderChildren(token.tokens)}
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
		case 'code':
			return <CodeBlock key={index} code={token.text} lang={resolveLang(token.lang)} />
		case 'blockquote':
			return (
				<blockquote key={index} className={cn(k.blockquote)}>
					{renderChildren(token.tokens)}
				</blockquote>
			)
		case 'list':
			return renderList(token as Tokens.List, index)
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

function renderList(token: Tokens.List, key: number): ReactNode {
	const items = token.items.map(renderListItem)

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

function renderListItem(item: Tokens.ListItem, index: number): ReactNode {
	return (
		<li key={index} className={cn(k.li, item.task && k.task)}>
			{renderChildren(item.tokens)}
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
 * Resolve a fenced code block's info string to a Shiki grammar id: its first
 * word (info strings carry extra metadata, e.g. a filename, after the
 * language), or `'text'` — Shiki's built-in no-highlight grammar — for an
 * unlabeled fence. An id Shiki doesn't bundle still renders: {@link CodeBlock}
 * falls back to plain text rather than throwing.
 */
function resolveLang(lang: string | undefined): BundledLanguage {
	return (lang?.trim().split(/\s+/, 1)[0] || 'text') as BundledLanguage
}
