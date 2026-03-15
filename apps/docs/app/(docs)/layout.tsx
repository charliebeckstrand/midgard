import type { ReactNode } from 'react'
import { getAllDocs, groupDocs } from '@/docs'
import { Client } from './client'

export default async function DocsLayout({ children }: { children: ReactNode }) {
	const allDocs = await getAllDocs()
	const { guides, reference } = groupDocs(allDocs)

	const toEntries = (docs: typeof allDocs) => docs.map((d) => ({ slug: d.slug, title: d.title }))

	return (
		<Client guides={toEntries(guides)} reference={toEntries(reference)}>
			{children}
		</Client>
	)
}
