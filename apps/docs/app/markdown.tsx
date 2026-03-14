import type { ComponentPropsWithoutRef } from 'react'
import { MarkdownAsync } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { highlight } from '@/lib/highlight'

interface MarkdownProps {
	content: string
}

async function Code({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
	const match = className?.match(/language-(\w+)/)
	const lang = match?.[1]
	const code = String(children).trim()

	if (!lang) {
		return (
			<code className={className} {...props}>
				{children}
			</code>
		)
	}

	const html = await highlight(code, lang)

	return (
		// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered syntax highlighting from trusted local files
		<div dangerouslySetInnerHTML={{ __html: html }} />
	)
}

function stripAuthMarker(content: string): string {
	return content.replace(/^<!--\s*auth:\s*required\s*-->\n?/, '')
}

export async function Markdown({ content }: MarkdownProps) {
	return (
		<div className="prose dark:prose-invert max-w-none">
			<MarkdownAsync remarkPlugins={[remarkGfm]} components={{ code: Code }}>
				{stripAuthMarker(content)}
			</MarkdownAsync>
		</div>
	)
}
