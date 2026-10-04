'use client'

import { useEffect, useRef, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { cn } from '../../core'
import { useComposedRef, useScrollOverflow, useScrollRegion } from '../../hooks'
import { k } from '../../recipes/kata/code'
import { CopyButton } from '../copy-button'
import { loadShiki } from './code-shiki'

const MAX_CACHE_SIZE = 200

/**
 * Token cache keyed by theme + language + code. Process-wide, so it serves every
 * CodeBlock instance, not only a remounting one. A mount policy that keeps a
 * hidden block alive shifts the hit rate here, but never retires the cache.
 */
const htmlCache = new Map<string, string>()

const cacheKey = (code: string, lang: string, theme: string) => `${theme}\u0000${lang}\u0000${code}`

/**
 * Stores one tokenized snippet, evicting the oldest insertion once the cache is
 * full. Insertion-ordered, not recency-ordered: a hit doesn't move its entry, so
 * a snippet re-read past 200 distinct others is re-tokenized.
 *
 * @internal
 */
function cacheSet(key: string, value: string) {
	if (htmlCache.size >= MAX_CACHE_SIZE) {
		const first = htmlCache.keys().next().value as string

		htmlCache.delete(first)
	}

	htmlCache.set(key, value)
}

/** Props for {@link CodeBlock}. */
export type CodeBlockProps = {
	/** Source to highlight; surrounding whitespace is trimmed before tokenizing. */
	code: string
	/** Shiki language grammar. @defaultValue 'tsx' */
	lang?: BundledLanguage
	/** Shiki color theme. @defaultValue 'github-dark-default' */
	theme?: BundledTheme
	/** Renders a CopyButton overlay. @defaultValue true */
	copy?: boolean
	/**
	 * Accessible name of the scroll container. While a line overflows it, the
	 * container is a region with this name.
	 *
	 * @defaultValue 'Code'
	 */
	label?: string
	className?: string
}

/**
 * Syntax-highlighted code block. Lazily loads Shiki via {@link loadShiki},
 * tokenizes `code` for the given `lang` and `theme`, and renders an unstyled
 * `<pre>` fallback during the async pass. An optional CopyButton overlays the
 * snippet.
 *
 * @remarks
 * Client-only (`'use client'`): highlighting runs in an effect. Results are
 * memoized in a process-wide cache (max 200 entries, oldest insertion evicted)
 * keyed by theme, language, and code, so repeat snippets paint synchronously.
 * The highlighted `<pre>` is made non-focusable (`tabindex="-1"`), so a block
 * that fits adds no tab stop. The scroll container is a tab stop only while a
 * line overflows it ({@link useScrollRegion}), and it is then a region named by
 * `label`. The code is always left to right, also under an RTL ancestor.
 * Markup paints only for the current code. While `code` streams, one
 * tokenization runs at a time and the next one takes the newest code.
 */
export function CodeBlock({
	code: rawCode,
	lang = 'tsx',
	theme = 'github-dark-default',
	copy = true,
	label = 'Code',
	className,
}: CodeBlockProps) {
	const code = rawCode.trim()

	const key = cacheKey(code, lang, theme)

	// The newest markup that this block tokenized, with the key it answers. A
	// result for other code never paints: the fallback shows until the current
	// code has its own markup.
	const [result, setResult] = useState<{ key: string; html: string } | null>(null)

	// A cached snippet paints on the render that asks for it.
	const html = result?.key === key ? result.html : (htmlCache.get(key) ?? null)

	// The snippet that the next tokenization takes, and whether one runs now.
	// Streamed code changes on each chunk. One tokenization runs at a time, and
	// the next one takes the newest code, so the chunks between are not
	// tokenized.
	const latest = useRef({ key, code, lang, theme })

	const running = useRef(false)

	useEffect(() => {
		latest.current = { key, code, lang, theme }

		if (running.current || htmlCache.has(key)) return

		const run = () => {
			const job = latest.current

			const cached = htmlCache.get(job.key)

			// Another block can cache the newest code while this pass runs. No render
			// reads that entry, so paint it here.
			if (cached !== undefined) {
				running.current = false

				setResult({ key: job.key, html: cached })

				return
			}

			running.current = true

			loadShiki()
				.then(({ codeToHtml }) =>
					codeToHtml(job.code, {
						lang: job.lang,
						theme: job.theme,
						transformers: [
							{
								pre(node) {
									node.properties.tabindex = '-1'
								},
							},
						],
					}),
				)
				.then(
					(markup) => {
						cacheSet(job.key, markup)

						if (latest.current.key === job.key) setResult({ key: job.key, html: markup })
					},
					// Shiki can fail to load (offline chunk fetch, post-deploy 404) or to
					// tokenize (a lang/theme outside the bundled set). Keep the plain
					// fallback rather than leaking an unhandled rejection.
					() => {},
				)
				.finally(() => {
					if (latest.current.key === job.key) running.current = false
					else run()
				})
		}

		run()
	}, [key, code, lang, theme])

	const scrollOverflowRef = useScrollOverflow({ axis: 'horizontal' })

	const scrollRegionRef = useScrollRegion({ label })

	const setContent = useComposedRef<HTMLDivElement>(scrollOverflowRef, scrollRegionRef)

	return (
		<div data-slot="code-block" className={cn(k.wrapper, className)}>
			{/* Code reads left to right in each locale, so an RTL ancestor must not mirror it. */}
			<div ref={setContent} dir="ltr" className={cn(k.block.content)}>
				{html ? (
					<div
						// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				) : (
					<pre className={cn(k.block.fallback)} tabIndex={-1}>
						<code>{code}</code>
					</pre>
				)}
			</div>
			{copy && <CopyButton text={code} size="sm" className={cn(k.copy)} />}
		</div>
	)
}
