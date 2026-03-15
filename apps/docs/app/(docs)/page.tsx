import { getAllDocs, groupDocs } from '@/docs'
import { Markdown } from '@/markdown'
import { AnchorLink } from './anchor-link'

export default async function DocsHome() {
	const allDocs = await getAllDocs()
	const { guides, reference } = groupDocs(allDocs)
	const docs = [...guides, ...reference]

	return (
		<div className="mx-auto max-w-3xl">
			{docs.map((doc) => (
				<section key={doc.slug} id={doc.slug} className="group/section scroll-mt-8 py-8 first:pt-0">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1">
							<Markdown content={doc.content} />
						</div>
						<div className="sticky top-3 shrink-0 pt-0.5">
							<AnchorLink slug={doc.slug} />
						</div>
					</div>
				</section>
			))}
		</div>
	)
}
