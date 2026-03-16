'use client'

import { Navbar, SidebarLayout } from 'catalyst'
import { usePathname } from 'next/navigation'

import { DocsSidebar } from './sidebar'
import type { ClientProps } from './types'

export function Client({ children, guides, reference }: ClientProps) {
	const pathname = usePathname()

	const activeSlug = pathname === '/' ? null : pathname.slice(1)

	return (
		<SidebarLayout
			navbar={<Navbar />}
			sidebar={<DocsSidebar guides={guides} reference={reference} activeSlug={activeSlug} />}
		>
			{children}
		</SidebarLayout>
	)
}
