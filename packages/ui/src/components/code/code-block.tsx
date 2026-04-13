'use client'

import { useEffect, useState } from 'react'
import { type BundledLanguage, type BundledTheme, codeToHtml } from 'shiki'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { CopyButton } from '../copy-button'
import { codeBlockVariants } from './variants'

const k = katachi.code.block

/** Shared cache keyed by `${theme}\u0000${lang}\u0000${code}`. Avoids re-tokenizing on remount. */
const htmlCache = new Map<string, string>()

const cacheKey = (code: string, lang: string, theme: string) => `${theme}\u0000${lang}\u0000${code}`

export type CodeBlockProps = {
	code: string
	lang?: BundledLanguage
	theme?: BundledTheme
	inline?: boolean
	className?: string
}

export function CodeBlock({
	code: rawCode,
	lang = 'tsx',
	theme = 'github-dark-default',
	inline,
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

		codeToHtml(code, {
			lang,
			theme,
			transformers: [
				{
					pre(node) {
						delete node.properties.tabindex
					},
				},
			],
		}).then((result) => {
			htmlCache.set(key, result)

			if (!cancelled) setHtml(result)
		})

		return () => {
			cancelled = true
		}
	}, [code, lang, theme])

	return (
		<div data-slot="code-block" className={cn(codeBlockVariants({ inline }), className)}>
			<div className={cn(k.copyWrapper)}>
				<CopyButton value={code} className={cn(k.copy)} />
			</div>
			{html ? (
				<div
					className={cn(k.content)}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className={cn(k.fallback)}>
					<code>{code}</code>
				</pre>
			)}
		</div>
	)
}
