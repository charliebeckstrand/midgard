import type { ReactNode } from 'react'
import { getAllDocs } from '@/lib/docs'
import { Client } from './client'

export default async function DocsLayout({ children }: { children: ReactNode }) {
	const allDocs = await getAllDocs()

	const docs = allDocs.map((d) => ({ slug: d.slug, title: d.title }))

	return <Client docs={docs}>{children}</Client>
}
