import type { ReactNode } from 'react'
import { Client } from '@/client'
import { getSession } from '@/lib/auth'
import { getAllDocs } from '@/lib/docs'

export default async function DocsLayout({ children }: { children: ReactNode }) {
	const [session, allDocs] = await Promise.all([getSession(), getAllDocs()])
	const { authenticated } = session

	const docs = allDocs
		.filter((d) => !d.authRequired || authenticated)
		.map((d) => ({ slug: d.slug, title: d.title, authRequired: d.authRequired }))

	return (
		<Client docs={docs} authenticated={authenticated}>
			{children}
		</Client>
	)
}
