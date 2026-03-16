'use client'

import { useEffect, useState } from 'react'
import { Heading } from '../components/heading'
import { SidebarLayout } from '../components/layouts'
import { Navbar, NavbarItem, NavbarLabel, NavbarSection, NavbarSpacer } from '../components/navbar'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from '../components/sidebar'

type DemoModule = {
	default: React.ComponentType
	meta?: { name?: string; category?: string }
}

const modules = import.meta.glob<DemoModule>('./demos/*.tsx', { eager: true })

const demos = Object.entries(modules)
	.map(([path, mod]) => {
		const id = path.replace('./demos/', '').replace('.tsx', '')
		const name = mod.meta?.name ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
		const category = mod.meta?.category ?? 'Other'
		return { id, name, category, component: mod.default }
	})
	.sort((a, b) => a.name.localeCompare(b.name))

const categories = demos.reduce<Record<string, typeof demos>>((acc, demo) => {
	if (!acc[demo.category]) acc[demo.category] = []
	acc[demo.category].push(demo)
	return acc
}, {})

const categoryOrder = [
	'Forms',
	'Data Display',
	'Feedback',
	'Overlay',
	'Navigation',
	'Layout',
	'Other',
]

const sortedCategories = Object.entries(categories).sort(
	([a], [b]) => (categoryOrder.indexOf(a) >>> 0) - (categoryOrder.indexOf(b) >>> 0),
)

function useHash() {
	const [hash, setHash] = useState(() => window.location.hash.slice(1) || demos[0]?.id || '')

	useEffect(() => {
		const onHashChange = () => setHash(window.location.hash.slice(1) || demos[0]?.id || '')
		window.addEventListener('hashchange', onHashChange)
		return () => window.removeEventListener('hashchange', onHashChange)
	}, [])

	return hash
}

export function App() {
	const route = useHash()
	const current = demos.find((d) => d.id === route)

	return (
		<SidebarLayout
			navbar={
				<Navbar>
					<NavbarSection>
						<NavbarItem href="#">
							<NavbarLabel>UI Components</NavbarLabel>
						</NavbarItem>
					</NavbarSection>
					<NavbarSpacer />
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarItem href="#">
							<SidebarLabel className="font-semibold">UI Components</SidebarLabel>
						</SidebarItem>
					</SidebarHeader>
					<SidebarBody>
						{sortedCategories.map(([category, items]) => (
							<SidebarSection key={category}>
								<span className="px-2 text-xs/6 font-medium text-zinc-500">{category}</span>
								{items.map((demo) => (
									<SidebarItem key={demo.id} href={`#${demo.id}`} current={route === demo.id}>
										<SidebarLabel>{demo.name}</SidebarLabel>
									</SidebarItem>
								))}
							</SidebarSection>
						))}
					</SidebarBody>
				</Sidebar>
			}
		>
			{current ? (
				<div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
					<Heading>{current.name}</Heading>
					<current.component />
				</div>
			) : (
				<div className="p-10">
					<Heading>Select a component</Heading>
				</div>
			)}
		</SidebarLayout>
	)
}
