import { Marked } from 'marked'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'

// Module-scoped instance: keeps options local instead of mutating the shared
// `marked` singleton a consuming app may also configure. GFM is on (tables,
// task lists, strikethrough, autolinks).
const md = new Marked({ gfm: true })

export type MarkdownProps = {
	/** Markdown source to render. Must be trusted — the output is not sanitized. */
	children: string
	className?: string
}

/**
 * Renders Markdown to HTML with [marked](https://marked.js.org) and styles the
 * result as prose. GitHub-flavored Markdown is enabled, so tables, task lists,
 * `~~strikethrough~~`, and autolinks all parse.
 *
 * A static, server-renderable leaf: parsing is synchronous, so it composes
 * inside React Server Components.
 *
 * **Security:** the parsed HTML is injected with `dangerouslySetInnerHTML` and
 * is **not** sanitized — `marked` passes any raw HTML in the source straight
 * through. Render only trusted Markdown (authored docs, this library's API
 * descriptions). For untrusted input, sanitize the output first (e.g. with
 * DOMPurify) before handing it to this component.
 */
export function Markdown({ children, className }: MarkdownProps) {
	// Synchronous parse (no async extensions registered) keeps this a static,
	// server-renderable leaf.
	const html = md.parse(children, { async: false })

	return (
		<div
			data-slot="markdown"
			className={cn(k.base, className)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: renders trusted Markdown only; see the security note above
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
