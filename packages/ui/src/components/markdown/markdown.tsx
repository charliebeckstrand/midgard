import { Marked, type Token } from 'marked'
import { memo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/markdown'
import { type MarkdownHeadingOffset, MarkdownRenderer } from './markdown-renderer'

// Module-scoped instance: keeps options local instead of mutating the shared
// `marked` singleton a consuming app can also configure. GFM is on (tables,
// task lists, strikethrough, autolinks).
const md = new Marked({ gfm: true })

// The same, with each line break in a paragraph as a `<br>` (the `breaks`
// option of `marked`).
const mdBreaks = new Marked({ gfm: true, breaks: true })

/** The count of sources that each token cache holds. */
export const MARKDOWN_CACHE_SIZE = 200

/**
 * The tokens of each block source that a {@link Markdown} lexed or that
 * {@link primeMarkdown} stored. Process-wide, so it serves each block with the
 * same source. The first lex of a page is slow, because the regular
 * expressions of `marked` compile then. Insertion-ordered: when the cache is
 * full, the oldest entry goes. The `breaks` form lexes a source to different
 * tokens, so it has a cache of its own.
 */
const tokenCache = new Map<string, Token[]>()

const breaksTokenCache = new Map<string, Token[]>()

/** The block tokens of `source`, from the cache or from a new lex. */
function lex(source: string, breaks = false): Token[] {
	const lexer = breaks ? mdBreaks : md

	const cache = breaks ? breaksTokenCache : tokenCache

	const cached = cache.get(source)

	if (cached) return cached

	const tokens = lexer.lexer(source)

	if (cache.size >= MARKDOWN_CACHE_SIZE) {
		cache.delete(cache.keys().next().value as string)
	}

	cache.set(source, tokens)

	return tokens
}

/**
 * Lexes a Markdown source before a {@link Markdown} renders it, such as in
 * idle time. The block with the same source then renders from the stored
 * tokens, and its render does not lex.
 *
 * @param source - The source, as the `children` of the block give it.
 * @param options - `breaks`, as the block that renders the source sets it.
 * @remarks
 * The cache holds 200 sources and drops the oldest first, so prime the
 * sources of one page, not the sources of a whole site. The `breaks` form has
 * a cache of its own of the same size.
 */
export function primeMarkdown(source: string, options?: { breaks?: boolean }): void {
	lex(source, options?.breaks)
}

/** Props for {@link Markdown}: the Markdown source string to render as prose, and the heading offset. */
export type MarkdownProps = {
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
	className?: string
}

/**
 * Markdown source rendered to a React element tree with
 * [marked](https://marked.js.org) and styled as prose, in a block `<div>`.
 * GitHub-flavored Markdown is enabled, so tables, task lists,
 * `~~strikethrough~~`, and autolinks all parse. With `breaks`, each line break
 * in a paragraph renders as a `<br>`.
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
 * text, image `alt`, and titles. Each numeric reference decodes, and so do the
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
}: MarkdownProps) {
	return (
		<div data-slot="markdown" className={cn(k.base, className)}>
			<MarkdownRenderer tokens={lex(children, breaks)} headingOffset={headingOffset} />
		</div>
	)
})
