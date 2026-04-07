'use client'

import { useCallback, useEffect, useState } from 'react'
import { type BundledTheme, codeToHtml } from 'shiki'
import { Button } from '../components/button'
import { CheckIcon, CopyIcon } from '../icons'

const theme: BundledTheme = 'github-dark-default'

function CopyButton({ code }: { code: string }) {
	const [copied, setCopied] = useState(false)

	const copy = useCallback(() => {
		navigator.clipboard.writeText(code)

		setCopied(true)
	}, [code])

	useEffect(() => {
		if (!copied) return

		const timer = setTimeout(() => setCopied(false), 2000)

		return () => clearTimeout(timer)
	}, [copied])

	return (
		<div className="absolute top-0 right-0 pt-3 pr-3 bg-[#0d1117]">
			<Button
				variant="plain"
				disabled={copied}
				onClick={copy}
				aria-label={copied ? 'Copied' : 'Copy to clipboard'}
				className={`disabled:opacity-100 ${copied ? 'text-green-500!' : 'text-zinc-400! hover:text-white!'}`}
			>
				{copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
			</Button>
		</div>
	)
}

export function CodeBlock({ code: rawCode }: { code: string }) {
	const code = rawCode.trim()

	const [html, setHtml] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		codeToHtml(code, {
			lang: 'tsx',
			theme,
			transformers: [
				{
					pre(node) {
						delete node.properties.tabindex
					},
				},
			],
		}).then((result) => {
			if (!cancelled) setHtml(result)
		})

		return () => {
			cancelled = true
		}
	}, [code])

	return (
		<div className="relative">
			<CopyButton code={code} />
			{html ? (
				<div
					className="[&_pre]:overflow-x-auto [&_pre]:rounded-b-lg [&_pre]:p-4 [&_pre]:pr-14 [&_pre]:text-sm/6"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className="overflow-x-auto rounded-b-lg bg-[#0d1117] p-4 pr-14 text-sm/6 text-zinc-400">
					<code>{code}</code>
				</pre>
			)}
		</div>
	)
}
