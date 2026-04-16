'use client'

import { useEffect, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { cn } from '../../core'
import { CopyButton } from '../copy-button'
import { codeBlockVariants, k } from './variants'

const MAX_CACHE_SIZE = 200

/** Token cache keyed by theme + language + code. Avoids re-tokenizing on remount. */
const htmlCache = new Map<string, string>()

const cacheKey = (code: string, lang: string, theme: string) => `${theme}\u0000${lang}\u0000${code}`

function cacheSet(key: string, value: string) {
	if (htmlCache.size >= MAX_CACHE_SIZE) {
		const first = htmlCache.keys().next().value as string

		htmlCache.delete(first)
	}

	htmlCache.set(key, value)
}

// Lazy-load shiki on first use to keep the initial bundle small.
let shikiPromise: Promise<typeof import('shiki')> | null = null

export function loadShiki() {
	if (!shikiPromise) {
		shikiPromise = import('shiki')
	}

	return shikiPromise
}

export type CodeBlockProps = {
	code: string
	lang?: BundledLanguage
	theme?: BundledTheme
	inline?: boolean
	copy?: boolean
	className?: string
}

export function CodeBlock({
	code: rawCode,
	lang = 'tsx',
	theme = 'github-dark-default',
	inline,
	copy = true,
	className,
}: CodeBlockProps) {
	const code = rawCode.trim()

	const [html, setHtml] = useState<string | null>(
		() => htmlCache.get(cacheKey(code, lang, theme)) ?? null,
	)

	useEffect(() => {
		const key = cacheKey(code, lang, theme)

		const cached = htmlCache.get(key)

		if (cached) {
			setHtml(cached)

			return
		}

		let cancelled = false

		loadShiki().then(({ codeToHtml }) =>
			codeToHtml(code, {
				lang,
				theme,
				transformers: [
					{
						pre(node) {
							node.properties.tabindex = '-1'
						},
					},
				],
			}).then((result) => {
				cacheSet(key, result)

				if (!cancelled) setHtml(result)
			}),
		)

		return () => {
			cancelled = true
		}
	}, [code, lang, theme])

	return (
		<div data-slot="code-block" className={cn(codeBlockVariants({ inline }), className)}>
			{copy && (
				<div className={cn(k.block.copyButtonWrapper)}>
					<CopyButton value={code} className={cn(k.block.copyButton)} size="sm" />
				</div>
			)}
			{html ? (
				<div
					className={cn(k.block.content, copy && k.block.contentCopy)}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className={cn(k.block.fallback, copy && k.block.fallbackCopy)} tabIndex={-1}>
					<code>{code}</code>
				</pre>
			)}
		</div>
	)
}
