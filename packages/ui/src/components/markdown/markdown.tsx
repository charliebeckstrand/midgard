import { Marked } from 'marked'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { MarkdownRenderer } from './markdown-renderer'

// Module-scoped instance: keeps options local instead of mutating the shared
// `marked` singleton a consuming app may also configure. GFM is on (tables,
// task lists, strikethrough, autolinks).
const md = new Marked({ gfm: true })

/** Props for {@link Markdown}: the Markdown source string to render as prose. */
export type MarkdownProps = {
	/** Markdown source to render. */
	children: string
	className?: string
	/**
	 * Parse inline-only and render into a `<span>` instead of a block `<div>` —
	 * for prose that sits in the flow of surrounding text. Block constructs
	 * (headings, lists, code fences) do not parse in this mode.
	 *
	 * @defaultValue false
	 */
	inline?: boolean
}

/**
 * Markdown source rendered to a React element tree with
 * [marked](https://marked.js.org) and styled as prose. GitHub-flavored Markdown
 * is enabled, so tables, task lists, `~~strikethrough~~`, and autolinks all
 * parse.
 *
 * @remarks
 * Static, server-renderable leaf: lexing and rendering are synchronous and
 * hook-free, so it composes inside React Server Components.
 *
 * Security: the source is walked token by token into elements this component
 * controls — raw HTML in the source is dropped, never injected — so untrusted
 * Markdown cannot reach the DOM as markup. (Untrusted input can still produce
 * surprising links or images; validate those at the call site if needed.)
 */
export function Markdown({ children, className, inline = false }: MarkdownProps) {
	if (inline) {
		return (
			<span data-slot="markdown" className={cn(k.inline, className)}>
				<MarkdownRenderer tokens={md.Lexer.lexInline(children, { gfm: true })} />
			</span>
		)
	}

	return (
		<div data-slot="markdown" className={cn(k.root, className)}>
			<MarkdownRenderer tokens={md.lexer(children)} />
		</div>
	)
}
