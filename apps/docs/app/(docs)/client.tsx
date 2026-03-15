'use client'

import {
	Navbar,
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarHeading,
	SidebarItem,
	SidebarLabel,
	SidebarLayout,
	SidebarSection,
} from 'catalyst'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ShinyText } from 'reactbits'

interface DocEntry {
	slug: string
	title: string
}

interface ClientProps {
	children: ReactNode
	guides: DocEntry[]
	reference: DocEntry[]
}

export function Client({ children, guides, reference }: ClientProps) {
	const [activeSlug, setActiveSlug] = useState<string | null>(null)
	const allDocs = [...guides, ...reference]
	const slugsRef = useRef(allDocs.map((d) => d.slug))

	useEffect(() => {
		slugsRef.current = [...guides, ...reference].map((d) => d.slug)
	}, [guides, reference])

	useEffect(() => {
		const sections = slugsRef.current
			.map((slug) => document.getElementById(slug))
			.filter((el): el is HTMLElement => el !== null)

		if (sections.length === 0) return

		const ratios = new Map<string, number>()

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					ratios.set(entry.target.id, entry.intersectionRatio)
				}

				let best: string | null = null
				let bestRatio = 0

				for (const [id, ratio] of ratios) {
					if (ratio > bestRatio) {
						best = id
						bestRatio = ratio
					}
				}

				if (best) setActiveSlug(best)
			},
			{
				rootMargin: '-64px 0px 0px 0px',
				threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
			},
		)

		for (const section of sections) {
			observer.observe(section)
		}

		return () => observer.disconnect()
	}, [])

	return (
		<SidebarLayout
			navbar={<Navbar />}
			sidebar={
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
								<SidebarItem key={doc.slug} href={`#${doc.slug}`} current={activeSlug === doc.slug}>
									<SidebarLabel>{doc.title}</SidebarLabel>
								</SidebarItem>
							))}
						</SidebarSection>
						<SidebarSection>
							<SidebarHeading>Reference</SidebarHeading>
							{reference.map((doc) => (
								<SidebarItem key={doc.slug} href={`#${doc.slug}`} current={activeSlug === doc.slug}>
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
