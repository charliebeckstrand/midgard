import { Marked } from 'marked'
import { memo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { type MarkdownFence, MarkdownRenderer } from './markdown-renderer'

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
	/**
	 * Fenced-code override, called per fence with its body and language; return
	 * a node to claim the fence (a chart, a diagram) or `undefined` to keep the
	 * default syntax-highlighted rendering. See {@link MarkdownFence}. Pass a
	 * stable reference — an inline closure busts this component's memo. Inert
	 * under `inline`, where fences do not parse.
	 */
	fence?: MarkdownFence
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
 * Color-agnostic: the prose carries rhythm, weight, and size but no `text-*`
 * color, so the whole tree inherits the foreground of whatever container it
 * renders in. Set the color on the wrapper (or an ancestor) — via `className`
 * or the surrounding element — and headings, body, links, and tables all
 * follow; there is no baked-in palette to override.
 *
 * Security: the source is walked token by token into elements this component
 * controls — raw HTML in the source is dropped, never injected — so untrusted
 * Markdown cannot reach the DOM as markup. (Untrusted input can still produce
 * surprising links or images; validate those at the call site if needed.)
 *
 * Memoized on its (shallow-equal) props: re-lexing is wasted work when a
 * parent re-renders for unrelated reasons, e.g. a list of chat bubbles
 * re-rendering on every streamed chunk of the *last* message while every
 * earlier, settled bubble's `children` stays the same string.
 */
export const Markdown = memo(function Markdown({
	children,
	className,
	inline = false,
	fence,
}: MarkdownProps) {
	if (inline) {
		return (
			<span data-slot="markdown" className={cn(k.inline, className)}>
				<MarkdownRenderer tokens={md.Lexer.lexInline(children, { gfm: true })} />
			</span>
		)
	}

	return (
		<div data-slot="markdown" className={cn(k.root, className)}>
			<MarkdownRenderer tokens={md.lexer(children)} fence={fence} />
		</div>
	)
})
