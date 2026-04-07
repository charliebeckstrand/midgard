'use client'

import { useCallback, useEffect, useState } from 'react'
import { type BundledTheme, codeToHtml } from 'shiki'
import { Button } from '../components/button'

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
				size="sm"
				disabled={copied}
				onClick={copy}
				aria-label={copied ? 'Copied' : 'Copy to clipboard'}
				className={`disabled:opacity-100 ${copied ? 'text-green-500!' : 'text-zinc-100!'}`}
			>
				{copied ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="size-4"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
							clipRule="evenodd"
						/>
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="size-4"
						aria-hidden="true"
					>
						<path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
						<path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
					</svg>
				)}
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
