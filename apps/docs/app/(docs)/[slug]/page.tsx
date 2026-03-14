import { getSession } from 'heimdall'
import { notFound } from 'next/navigation'
import { getDoc, getDocSlugs } from '@/lib/docs'
import { Markdown } from '@/markdown'

interface DocPageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	const slugs = await getDocSlugs()
	return slugs.map((slug) => ({ slug }))
}

export default async function DocPage({ params }: DocPageProps) {
	const { slug } = await params

	const [doc, session] = await Promise.all([getDoc(slug), getSession()])

	if (!doc) notFound()

	if (doc.authRequired && !session.authenticated) {
		return (
			<div className="mx-auto max-w-3xl">
				<h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{doc.title}</h1>
				<div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
					<p className="text-zinc-600 dark:text-zinc-400">
						This document requires authentication.{' '}
						<a href="/login" className="text-blue-500 hover:underline">
							Sign in
						</a>{' '}
						to view it.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-3xl">
			<h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{doc.title}</h1>
			<div className="mt-6">
				<Markdown content={doc.content} />
			</div>
		</div>
	)
}
