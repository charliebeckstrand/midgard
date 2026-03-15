import { getAllDocs } from '@/lib/docs'
import { Markdown } from '@/markdown'

export default async function DocsHome() {
	const docs = await getAllDocs()

	return (
		<div className="mx-auto max-w-3xl">
			{docs.map((doc) => (
				<section key={doc.slug} id={doc.slug} className="scroll-mt-8 py-8 first:pt-0">
					<Markdown content={doc.content} />
				</section>
			))}
		</div>
	)
}
