import { getAllDocs, groupDocs } from '@/docs'
import { Markdown } from '@/markdown'

export default async function DocsHome() {
	const allDocs = await getAllDocs()

	const { guides, reference } = groupDocs(allDocs)

	const docs = [...guides, ...reference]

	return (
		<div className="mx-auto max-w-3xl">
			{docs.map((doc) => (
				<section key={doc.slug} id={doc.slug} className="scroll-mt-4 py-8 first:pt-4">
					<Markdown content={doc.content} />
				</section>
			))}
		</div>
	)
}
