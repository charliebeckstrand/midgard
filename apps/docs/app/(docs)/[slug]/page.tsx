import { notFound } from 'next/navigation'
import { getDoc } from '@/docs'
import { Markdown } from '@/markdown'

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params

	const doc = await getDoc(slug)

	if (!doc) notFound()

	return (
		<div className="mx-auto max-w-3xl">
			<Markdown content={doc.content} />
		</div>
	)
}
