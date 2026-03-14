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

	const doc = await getDoc(slug)

	if (!doc) notFound()

	return (
		<div className="mx-auto max-w-3xl">
			<div className="lg:mt-4">
				<Markdown content={doc.content} />
			</div>
		</div>
	)
}
