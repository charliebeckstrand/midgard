import { type ComponentProps, memo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { lex } from './markdown-lex'
import { type MarkdownHeadingOffset, MarkdownRenderer } from './markdown-renderer'

/**
 * Props for {@link Markdown}: the Markdown source string to render as prose, and the heading offset.
 * The `<div>` of the prose takes the rest. `children` is the source string.
 */
export type MarkdownProps = Omit<ComponentProps<'div'>, 'children'> & {
	/** Markdown source to render. */
	children: string
	/**
	 * The number of levels to add to each heading of the source, so that the
	 * headings fit under the outline of the page. With `1`, a `#` heading renders
	 * as an `<h2>`. The level stops at 6. The look of a heading stays that of its
	 * source depth. Use it for content that the app does not write, such as a chat
	 * message, which must not add an `<h1>` to the page.
	 * @defaultValue 0
	 */
	headingOffset?: MarkdownHeadingOffset
	/**
	 * Renders each line break in a paragraph as a `<br>`, as a GitHub comment
	 * does. Without it, the lines of a paragraph join, and only a blank line
	 * starts a new paragraph. Use it for text that a person typed, such as a
	 * review, where each line break is intentional.
	 * @defaultValue false
	 */
	breaks?: boolean
}

/**
 * Markdown source rendered to a React element tree with
 * [marked](https://marked.js.org) and styled as prose, in a block `<div>`.
 * GitHub-flavored Markdown is enabled, so tables, task lists,
 * `~~strikethrough~~`, and autolinks all parse. With `breaks`, each line break
 * in a paragraph renders as a `<br>`. A table that is wider than the prose
 * scrolls on the inline axis in its own box, as a fenced code block does, so
 * the container of the prose does not scroll.
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
 * Entity references such as `&amp;` and `&#169;` decode to their characters in
 * text, image `alt`, titles, and link and image URLs. A URL decodes before its
 * scheme check. Each numeric reference decodes, and so do the
 * named references that prose uses (the five XML names, `&nbsp;`, and common
 * typography and symbols). A rare name stays as text. Code keeps references
 * literal, as CommonMark specifies.
 *
 * Memoized on its (shallow-equal) props: re-lexing is wasted work when a
 * parent re-renders for unrelated reasons. One example is a list of chat bubbles
 * re-rendering on every streamed chunk of the *last* message. Every earlier,
 * settled bubble's `children` stays the same string.
 *
 * A source that a block lexed before, or that {@link primeMarkdown} stored,
 * renders from a process-wide token cache and does not lex again.
 */
export const Markdown = memo(function Markdown({
	children,
	headingOffset,
	breaks,
	className,
	...props
}: MarkdownProps) {
	return (
		<div
			{...props}
			// The chat message recipe reads this anchor, so it comes after the spread (CONVENTIONS.md §3.9).
			data-slot="markdown"
			className={cn(k().base, className)}
		>
			<MarkdownRenderer tokens={lex(children, breaks)} headingOffset={headingOffset} />
		</div>
	)
})
