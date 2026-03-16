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

	if (!html) {
		return (
			<div className="rounded-lg bg-zinc-950 p-4">
				<pre className="text-sm text-zinc-400">
					<code>{code}</code>
				</pre>
			</div>
		)
	}

	return (
		<div
			className="[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-sm/6"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
