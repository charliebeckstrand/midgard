'use client'

import { type ComponentProps, useEffect, useRef, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { announce, cn } from '../../core'
import { useScrollRegion } from '../../hooks'
import { useHydrated } from '../../hooks/use-hydrated'
import { type CodeBlockVariants, k } from '../../recipes/kata/code'
import { CopyButton } from '../copy-button'
import { DEFAULT_LANG, DEFAULT_THEME, highlightCode } from './code-shiki'

const MAX_CACHE_SIZE = 200

/**
 * Token cache keyed by theme + language + code. Process-wide, so it serves every
 * CodeBlock instance, not only a remounting one. A mount policy that keeps a
 * hidden block alive shifts the hit rate here, but never retires the cache.
 * The cache is on the main thread, so a hit paints on the render that asks for
 * it. The worker gives the markup of a miss.
 */
const htmlCache = new Map<string, string>()

const cacheKey = (code: string, lang: string, theme: string) => `${theme}\u0000${lang}\u0000${code}`

/**
 * Stores one tokenized snippet, evicting the oldest insertion once the cache is
 * full. Insertion-ordered, not recency-ordered: a hit doesn't move its entry, so
 * a snippet re-read past 200 distinct others is re-tokenized. A write to a key
 * that the cache holds replaces the markup in its place and evicts no entry.
 *
 * @internal
 */
function cacheSet(key: string, value: string) {
	if (!htmlCache.has(key) && htmlCache.size >= MAX_CACHE_SIZE) {
		const first = htmlCache.keys().next().value as string

		htmlCache.delete(first)
	}

	htmlCache.set(key, value)
}

/**
 * The display name of each language that names a code region, keyed by each
 * Shiki id and alias of the language. The names are the Shiki display names.
 * It is a `Map`, so a fence name such as `constructor` finds no name.
 */
const languageNames: ReadonlyMap<string, string> = new Map(
	(
		[
			['TSX', ['tsx']],
			['TypeScript', ['typescript', 'ts', 'cts', 'mts']],
			['JSX', ['jsx']],
			['JavaScript', ['javascript', 'js', 'cjs', 'mjs']],
			['JSON', ['json']],
			['JSON with Comments', ['jsonc']],
			['JSON5', ['json5']],
			['HTML', ['html']],
			['CSS', ['css']],
			['SCSS', ['scss']],
			['Less', ['less']],
			['Markdown', ['markdown', 'md']],
			['MDX', ['mdx']],
			['Shell', ['shellscript', 'bash', 'sh', 'shell', 'zsh']],
			['PowerShell', ['powershell', 'ps', 'ps1', 'pwsh']],
			['Python', ['python', 'py']],
			['Ruby', ['ruby', 'rb']],
			['Go', ['go']],
			['Rust', ['rust', 'rs']],
			['Java', ['java']],
			['Kotlin', ['kotlin', 'kt', 'kts']],
			['Swift', ['swift']],
			['C', ['c']],
			['C++', ['cpp', 'c++']],
			['C#', ['csharp', 'c#', 'cs']],
			['PHP', ['php']],
			['SQL', ['sql']],
			['GraphQL', ['graphql', 'gql']],
			['YAML', ['yaml', 'yml']],
			['TOML', ['toml']],
			['XML', ['xml']],
			['Dockerfile', ['docker', 'dockerfile']],
			['Diff', ['diff']],
			['Vue', ['vue']],
			['Svelte', ['svelte']],
		] satisfies [string, BundledLanguage[]][]
	).flatMap(([name, ids]) => ids.map((id) => [id, name] as const)),
)

/**
 * The default name of the code region: the display name of `lang` and "code",
 * such as "TypeScript code". With no `lang`, or a `lang` with no display name
 * here (`text`, for example), the name is "Code". Thus blocks of two languages
 * on one page are two regions with two names.
 *
 * @internal
 */
function regionName(lang: string | undefined): string {
	const name = lang === undefined ? undefined : languageNames.get(lang)

	return name === undefined ? 'Code' : `${name} code`
}

/**
 * Announces a refused copy. After a refused write, the CopyButton stays at
 * rest, and the rest glyph also means "not copied yet". CodeBlock has no prop
 * for the error, so the block reports the failure itself.
 *
 * @internal
 */
function announceCopyError() {
	announce('Copy failed')
}

/**
 * Props for {@link CodeBlock}. The root `<div>` also takes the `<div>`
 * attributes, such as `id`, `data-*`, and `aria-*`. `lang` names the grammar,
 * so the block does not take the HTML `lang` attribute.
 */
export type CodeBlockProps = Omit<ComponentProps<'div'>, 'className' | 'children' | 'lang'> & {
	/** Source to highlight; surrounding whitespace is trimmed before tokenizing. */
	code: string
	/** Shiki language grammar. @defaultValue 'tsx' */
	lang?: BundledLanguage
	/** Shiki color theme. @defaultValue 'github-dark-default' */
	theme?: BundledTheme
	/** Renders a CopyButton overlay. @defaultValue true */
	copy?: boolean
	/**
	 * The density step of the block. A `size` opens a density scope on the
	 * block, so the padding, the gap, and the code text take that step. With no
	 * `size`, the block takes the step of the nearest density scope.
	 */
	size?: CodeBlockVariants['size']
	/**
	 * Accessible name of the scroll container. While a line overflows it, the
	 * container is a region with this name.
	 *
	 * With no `label`, the name comes from the `lang` that you give: the display
	 * name of the language and "code", such as "TypeScript code" for `ts`. With
	 * no `lang`, or a `lang` that the block has no display name for, such as
	 * `text`, the name is "Code". Two blocks of one language thus have one name.
	 * Give each one a `label` when both can overflow on one page.
	 *
	 * @defaultValue the language of `lang` and "code", such as `'TypeScript code'`, else `'Code'`
	 */
	label?: string
	className?: string
}

/**
 * Stores markup that was highlighted elsewhere, such as at build time. A
 * {@link CodeBlock} with the same code, language, and theme then paints it on
 * its first render, and the worker does not run.
 *
 * @param entry - The `code`, `lang`, and `theme` of the block, as its props
 *   give them, and the `html` for them. `lang` and `theme` have the defaults of
 *   the block. The cache trims `code`, as the block does.
 * @remarks
 * The markup must have the shape that the worker of the block gives. Make it
 * with Shiki's `codeToHtml` from `shiki`, from the trimmed code, with these
 * options: `{ lang, theme, tabindex: -1, tokenizeTimeLimit: 0 }`. Use the
 * Shiki version of `ui`. With no `tokenizeTimeLimit`, a slow line can stop
 * after 500 ms, and the rest of the line then has no highlight.
 * Another engine or a transformer can give other markup.
 *
 * The block sets the markup with `dangerouslySetInnerHTML`. Prime only markup
 * that you trust.
 *
 * Call this on the client, before the block renders. A block reads the cache
 * when it renders, so a block that is on the page already keeps its own pass.
 * The server output and the hydration render never read the cache, so a primed
 * block hydrates the plain block and paints the markup in the render after
 * hydration. The cache holds 200 entries and evicts the oldest entry first, so
 * prime the blocks of one page, not the blocks of a whole site.
 */
export function primeCodeBlock({
	code,
	lang = DEFAULT_LANG,
	theme = DEFAULT_THEME,
	html,
}: Pick<CodeBlockProps, 'code' | 'lang' | 'theme'> & { html: string }): void {
	cacheSet(cacheKey(code.trim(), lang, theme), html)
}

/**
 * Syntax-highlighted code block. Highlights `code` for the given `lang` and
 * `theme` with Shiki in a module worker, and renders an unstyled `<pre>`
 * fallback until the markup arrives. An optional CopyButton overlays the
 * snippet. The padding, the gap, and the code text take the step of the
 * nearest density scope. An explicit `size` opens a scope on the block.
 *
 * @remarks
 * Client-only (`'use client'`). The worker loads Shiki, each grammar, and each
 * theme on first use, so the main thread never loads a grammar or a regex
 * engine. {@link loadShiki} starts the worker ahead of the first block. A Vite
 * app must set `worker.format` to `'es'`. The default `'iife'` cannot split a
 * worker, so Vite then puts every grammar and every theme into one worker file
 * of about 9.5 MB. Webpack and Turbopack split the worker with no option.
 *
 * Results are memoized in a process-wide cache (max 200 entries, oldest
 * insertion evicted) keyed by theme, language, and code. A cached snippet
 * paints highlighted on the first render of a block, and
 * {@link primeCodeBlock} fills the cache with markup made elsewhere. The server
 * renders the fallback, and so does the hydration render, so the hydration
 * matches the server output. The render after hydration paints a cached
 * snippet. Where the environment has no `Worker`, such as jsdom, the fallback
 * stays.
 *
 * The highlighted `<pre>` is made non-focusable (`tabindex="-1"`), so a block
 * that fits adds no tab stop. The scroll container is a tab stop only while a
 * line overflows it ({@link useScrollRegion}), and it is then a region named by
 * `label`. With no `label`, the name comes from `lang`, such as "TypeScript
 * code", else it is "Code". The code is always left to right, also under an RTL
 * ancestor.
 * Markup paints only for the current code. While `code` streams, one
 * tokenization runs at a time and the next one takes the newest code.
 *
 * A refused copy leaves the CopyButton at rest. The block then announces
 * "Copy failed" in the shared live region, where the button announces "Copied".
 *
 * At `md` the block is `p-4` with `text-sm` code. The CopyButton keeps the
 * `sm` size at each step, and it centers on the first code line.
 */
export function CodeBlock({
	code: rawCode,
	lang: langProp,
	theme = DEFAULT_THEME,
	copy = true,
	size,
	label,
	className,
	...props
}: CodeBlockProps) {
	const code = rawCode.trim()

	const lang = langProp ?? DEFAULT_LANG

	const key = cacheKey(code, lang, theme)

	// The server has no worker and no cache, so it renders the fallback. The
	// hydration render must render the same, also when the client cache holds
	// the snippet.
	const hydrated = useHydrated()

	// The newest markup that this block tokenized or read from the cache, with
	// the key it answers. A result for other code never paints: the fallback
	// shows until the current code has its own markup. A mount after hydration
	// starts from the cached entry, so the effect finds it and does not render
	// the block again. The hydration render does not read the cache.
	const [result, setResult] = useState<{ key: string; html: string } | null>(() => {
		if (!hydrated) return null

		const cached = htmlCache.get(key)

		return cached === undefined ? null : { key, html: cached }
	})

	// After hydration, a cached snippet paints on the render that asks for it.
	let html: string | null = null

	if (hydrated) html = result?.key === key ? result.html : (htmlCache.get(key) ?? null)

	// The snippet that the next tokenization takes, and whether one runs now.
	// Streamed code changes on each chunk. One tokenization runs at a time, and
	// the next one takes the newest code, so the chunks between are not
	// tokenized.
	const latest = useRef({ key, code, lang, theme })

	const running = useRef(false)

	useEffect(() => {
		latest.current = { key, code, lang, theme }

		if (running.current) return

		const run = () => {
			const job = latest.current

			const cached = htmlCache.get(job.key)

			// The result keeps a cached entry, so the block paints it also after the
			// cache evicts it. An entry can also come after the render: from
			// primeCodeBlock, or from another block while this pass runs. No render
			// reads that entry, so paint it here. When the result holds the entry
			// already, the update keeps the same object, and React does not render.
			if (cached !== undefined) {
				running.current = false

				setResult((prev) =>
					prev?.key === job.key && prev.html === cached ? prev : { key: job.key, html: cached },
				)

				return
			}

			running.current = true

			highlightCode(job.code, job.lang, job.theme)
				.then(
					(markup) => {
						cacheSet(job.key, markup)

						if (latest.current.key === job.key) setResult({ key: job.key, html: markup })
					},
					// The worker can fail to start (no `Worker`, a CSP refusal), to load
					// (offline chunk fetch, post-deploy 404), or to tokenize (a lang or
					// theme outside the bundled set). Keep the plain fallback rather than
					// leaking an unhandled rejection.
					() => {},
				)
				.finally(() => {
					if (latest.current.key === job.key) running.current = false
					else run()
				})
		}

		run()
	}, [key, code, lang, theme])

	// The default grammar does not say what the code is, so only a `lang` that
	// the caller gives names the region.
	const scrollRegionRef = useScrollRegion({ label: label ?? regionName(langProp) })

	return (
		<div
			data-slot="code-block"
			data-density={size}
			className={cn(k.block.base, className)}
			{...props}
		>
			{/* Code reads left to right in each locale, so an RTL ancestor must not mirror it. */}
			<div ref={scrollRegionRef} dir="ltr" className={cn(k.block.content)}>
				{html ? (
					<div
						// The cache key gives each snippet its own element. A switch between two
						// cached snippets thus replaces the child, and the scroll region measures
						// again. An update in place can keep the size of each box, so no resize
						// reports a new line width.
						key={key}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: the markup is Shiki output or primed markup that the app trusts
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				) : (
					<pre className={cn(k.block.fallback)} tabIndex={-1}>
						<code>{code}</code>
					</pre>
				)}
			</div>
			{copy && (
				<div className={cn(k.block.copy.line)}>
					<CopyButton
						text={code}
						size="sm"
						className={cn(k.block.copy.button)}
						onCopyError={announceCopyError}
					/>
				</div>
			)}
		</div>
	)
}
