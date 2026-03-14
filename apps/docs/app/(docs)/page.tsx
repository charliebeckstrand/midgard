import Link from 'next/link'
import { getAllDocs } from '@/lib/docs'

export default async function DocsHome() {
	const docs = await getAllDocs()

	return (
		<div className="mx-auto max-w-4xl">
			<h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Documentation</h1>
			<p className="mt-2 text-zinc-500 dark:text-zinc-400">
				Project knowledge base and reference documentation.
			</p>
			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				{docs.map((doc) => (
					<Link
						key={doc.slug}
						href={`/${doc.slug}`}
						className="group rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
					>
						<h2 className="font-semibold text-zinc-900 dark:text-white">{doc.title}</h2>
						{doc.description && (
							<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{doc.description}</p>
						)}
					</Link>
				))}
			</div>
		</div>
	)
}
