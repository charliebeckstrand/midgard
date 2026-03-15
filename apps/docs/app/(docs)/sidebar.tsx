'use client'

import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarHeading,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from 'catalyst'
import type { MouseEvent } from 'react'
import { ShinyText } from 'reactbits'

import type { DocEntry } from './types'

interface DocsSidebarProps {
	guides: DocEntry[]
	reference: DocEntry[]
	activeSlug: string | null
}

function scrollToSection(e: MouseEvent, slug: string) {
	e.preventDefault()
	document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	history.replaceState(null, '', `#${slug}`)
}

export function DocsSidebar({ guides, reference, activeSlug }: DocsSidebarProps) {
	return (
		<Sidebar>
			<SidebarHeader>
				<SidebarItem href="/">
					<img src="/square.png" alt="square" width={24} height={24} />
					<SidebarLabel>
						<ShinyText text="Docs" className="font-black text-lg" delay={10} yoyo />
					</SidebarLabel>
				</SidebarItem>
			</SidebarHeader>
			<SidebarBody>
				<SidebarSection>
					<SidebarHeading>Guides</SidebarHeading>
					{guides.map((doc) => (
						<SidebarItem
							key={doc.slug}
							href={`#${doc.slug}`}
							current={activeSlug === doc.slug}
							onClick={(e) => scrollToSection(e, doc.slug)}
						>
							<SidebarLabel>{doc.title}</SidebarLabel>
						</SidebarItem>
					))}
				</SidebarSection>
				<SidebarSection>
					<SidebarHeading>Reference</SidebarHeading>
					{reference.map((doc) => (
						<SidebarItem
							key={doc.slug}
							href={`#${doc.slug}`}
							current={activeSlug === doc.slug}
							onClick={(e) => scrollToSection(e, doc.slug)}
						>
							<SidebarLabel>{doc.title}</SidebarLabel>
						</SidebarItem>
					))}
				</SidebarSection>
			</SidebarBody>
		</Sidebar>
	)
}
