import { Marked, type Token } from 'marked'

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

/**
 * The block tokens of `source`, from the cache or from a new lex.
 *
 * @internal
 */
export function lex(source: string, breaks = false): Token[] {
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
