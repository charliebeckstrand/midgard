'use client'

import { Navbar, SidebarLayout } from 'catalyst'
import { useMemo } from 'react'

import { DocsSidebar } from './sidebar'
import type { ClientProps } from './types'
import { useActiveSlug } from './use-active-slug'

export function Client({ children, guides, reference }: ClientProps) {
	const slugs = useMemo(() => [...guides, ...reference].map((d) => d.slug), [guides, reference])
	const { activeSlug } = useActiveSlug(slugs)

	return (
		<SidebarLayout
			navbar={<Navbar />}
			sidebar={<DocsSidebar guides={guides} reference={reference} activeSlug={activeSlug} />}
		>
			{children}
		</SidebarLayout>
	)
}
