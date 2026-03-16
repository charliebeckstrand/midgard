import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactElement } from 'react'
import { Children, isValidElement } from 'react'
import { MarkdownAsync } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { highlight } from '@/highlight'

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

function Pre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
	const child = Children.toArray(children).find(isValidElement) as
		| ReactElement<ComponentPropsWithoutRef<'code'>>
		| undefined

	if (child?.props?.className?.includes('language-')) {
		return <>{children}</>
	}

	return <pre {...props}>{children}</pre>
}

function stripAuthMarker(content: string): string {
	return content.replace(/^<!--\s*auth:\s*required\s*-->\n?/, '')
}

function A({ href, ...props }: ComponentPropsWithoutRef<'a'>) {
	if (href?.startsWith('#')) {
		return <Link href={`/${href.slice(1)}`} {...props} />
	}

	return <a href={href} {...props} />
}

export async function Markdown({ content }: MarkdownProps) {
	return (
		<div className="prose dark:prose-invert max-w-none">
			<MarkdownAsync remarkPlugins={[remarkGfm]} components={{ a: A, code: Code, pre: Pre }}>
				{stripAuthMarker(content)}
			</MarkdownAsync>
		</div>
	)
}
