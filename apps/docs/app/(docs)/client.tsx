'use client'

import { Navbar, SidebarLayout } from 'catalyst'

import { DocsSidebar } from './sidebar'
import type { ClientProps } from './types'
import { useActiveSlug } from './use-active-slug'

export function Client({ children, guides, reference }: ClientProps) {
	const { activeSlug } = useActiveSlug(guides, reference)

	return (
		<SidebarLayout
			navbar={<Navbar />}
			sidebar={<DocsSidebar guides={guides} reference={reference} activeSlug={activeSlug} />}
		>
			{children}
		</SidebarLayout>
	)
}
