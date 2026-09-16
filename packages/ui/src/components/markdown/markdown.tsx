import { Marked } from 'marked'
import { memo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { MarkdownRenderer } from './markdown-renderer'

// Module-scoped instance: keeps options local instead of mutating the shared
// `marked` singleton a consuming app can also configure. GFM is on (tables,
// task lists, strikethrough, autolinks).
const md = new Marked({ gfm: true })

/** Props for {@link Markdown}: the Markdown source string to render as prose. */
export type MarkdownProps = {
	/** Markdown source to render. */
	children: string
	className?: string
}

/**
 * Markdown source rendered to a React element tree with
 * [marked](https://marked.js.org) and styled as prose, in a block `<div>`.
 * GitHub-flavored Markdown is enabled, so tables, task lists,
 * `~~strikethrough~~`, and autolinks all parse. For Markdown inside a line of
 * text, reach for {@link MarkdownInline}.
 *
 * @remarks
 * Static, server-renderable leaf: lexing and rendering are synchronous and
 * hook-free, so it composes inside React Server Components.
 *
 * Color-agnostic: the prose carries rhythm, weight, and size but no `text-*`
 * color, so the whole tree inherits the foreground of whatever container it
 * renders in. Set the color on the wrapper, or an ancestor, via `className`
 * or the surrounding element. Headings, body, links, and tables all follow.
 * There is no baked-in palette to override.
 *
 * Security: the source is walked token by token into elements this component
 * controls. Raw HTML in the source is dropped, never injected, so untrusted
 * Markdown cannot reach the DOM as markup. Link and image URLs are scheme-checked.
 * A link renders an `href` only for `http(s)`/`mailto`/`tel`, so a `javascript:`,
 * `data:`, or `vbscript:` link carries no `href` and cannot run script on click.
 * Images additionally allow `data:` URIs, which are inert as an image source.
 *
 * Memoized on its (shallow-equal) props: re-lexing is wasted work when a
 * parent re-renders for unrelated reasons. One example is a list of chat bubbles
 * re-rendering on every streamed chunk of the *last* message. Every earlier,
 * settled bubble's `children` stays the same string.
 */
export const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
	return (
		<div data-slot="markdown" className={cn(k.root, className)}>
			<MarkdownRenderer tokens={md.lexer(children)} />
		</div>
	)
})

/** Props for {@link MarkdownInline}: the Markdown source string to render in a line of text. */
export type MarkdownInlineProps = {
	/** Markdown source to render. Block constructs do not parse here. */
	children: string
	className?: string
}

/**
 * Markdown source rendered into a `<span>`, for prose that sits in the flow of
 * surrounding text. It runs the inline lexer, so emphasis, code spans, and
 * links parse and block constructs — headings, lists, code fences — do not.
 *
 * @remarks
 * The explicit counterpart of {@link Markdown} rather than a mode of it. The
 * two differ in lexer and in rendered element, and a block construct handed to
 * the inline lexer parses as nothing at all. A boolean cannot make that visible
 * at the call site; two names do.
 *
 * Shares {@link Markdown}'s renderer, and with it every security property: raw
 * HTML is dropped rather than injected, and link and image URLs are
 * scheme-checked. It is memoized on the same terms and is equally
 * server-renderable.
 *
 * @see {@link Markdown} for the block form.
 */
export const MarkdownInline = memo(function MarkdownInline({
	children,
	className,
}: MarkdownInlineProps) {
	return (
		<span data-slot="markdown" className={cn(k.inline, className)}>
			<MarkdownRenderer tokens={md.Lexer.lexInline(children, { gfm: true })} />
		</span>
	)
})
