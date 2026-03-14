'use client'

import {
	Navbar,
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarLayout,
	SidebarSection,
} from 'catalyst'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { ShinyText } from 'reactbits'

interface DocEntry {
	slug: string
	title: string
}

interface ClientProps {
	children: ReactNode
	docs: DocEntry[]
}

export function Client({ children, docs }: ClientProps) {
	const pathname = usePathname()

	return (
		<SidebarLayout
			navbar={<Navbar />}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarItem href="/" current={pathname === '/'}>
							<Image src="/square.png" alt="square" width={24} height={24} />
							<SidebarLabel>
								<ShinyText text="Docs" className="font-black text-lg" delay={10} yoyo />
							</SidebarLabel>
						</SidebarItem>
					</SidebarHeader>
					<SidebarBody>
						<SidebarSection>
							{docs.map((doc) => (
								<SidebarItem
									key={doc.slug}
									href={`/${doc.slug}`}
									current={pathname === `/${doc.slug}`}
								>
									<SidebarLabel>{doc.title}</SidebarLabel>
								</SidebarItem>
							))}
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			}
		>
			{children}
		</SidebarLayout>
	)
}
