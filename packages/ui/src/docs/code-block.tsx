'use client'

import { useEffect, useState } from 'react'
import { type BundledTheme, codeToHtml } from 'shiki'

const theme: BundledTheme = 'github-dark-default'

export function CodeBlock({ code }: { code: string }) {
	const [html, setHtml] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		codeToHtml(code, { lang: 'tsx', theme }).then((result) => {
			if (!cancelled) setHtml(result)
		})
		return () => {
			cancelled = true
		}
	}, [code])

	return html ? (
		<div
			className="[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-sm/6"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	) : (
		<pre className="overflow-x-auto rounded-lg bg-[#0d1117] p-4 text-sm/6 text-zinc-400">
			<code>{code}</code>
		</pre>
	)
}
