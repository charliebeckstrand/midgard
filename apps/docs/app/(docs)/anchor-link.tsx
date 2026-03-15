'use client'

import { LinkIcon } from '@heroicons/react/20/solid'
import { useCallback, useState } from 'react'

interface AnchorLinkProps {
	slug: string
}

export function AnchorLink({ slug }: AnchorLinkProps) {
	const [copied, setCopied] = useState(false)

	const copy = useCallback(() => {
		const url = `${window.location.origin}${window.location.pathname}#${slug}`
		navigator.clipboard.writeText(url)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}, [slug])

	return (
		<button
			type="button"
			onClick={copy}
			aria-label={`Copy link to ${slug}`}
			className="inline-flex items-center rounded p-1 text-zinc-400 opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
		>
			{copied ? (
				<span className="text-xs font-medium text-emerald-500">Copied!</span>
			) : (
				<LinkIcon className="size-4" />
			)}
		</button>
	)
}
