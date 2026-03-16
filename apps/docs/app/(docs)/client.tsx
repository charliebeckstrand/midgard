'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from 'ui/navbar'
import { SidebarLayout } from 'ui/sidebar-layout'

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
