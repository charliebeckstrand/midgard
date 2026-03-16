'use client'

import { useEffect, useState } from 'react'
import { Button } from '../components/button'
import { Divider } from '../components/divider'
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
import { CodeBlock } from './code-block'

type DemoModule = {
	default: React.ComponentType
	meta?: { name?: string; category?: string }
}

const modules = import.meta.glob<DemoModule>('./demos/*.tsx', { eager: true })

const sources = import.meta.glob<string>('./demos/*.tsx', {
	eager: true,
	query: '?raw',
	import: 'default',
})

const demos = Object.entries(modules)
	.map(([path, mod]) => {
		const id = path.replace('./demos/', '').replace('.tsx', '')
		const name = mod.meta?.name ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

		const category = mod.meta?.category ?? 'Other'

		const source = (sources[path] as string) ?? ''

		return { id, name, category, component: mod.default, source }
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

const defaultDemo = sortedCategories[0]?.[1]?.[0]?.id || demos[0]?.id || ''

function useHash() {
	const [hash, setHash] = useState(() => window.location.hash.slice(1) || defaultDemo)

	useEffect(() => {
		const onHashChange = () => setHash(window.location.hash.slice(1) || defaultDemo)

		window.addEventListener('hashchange', onHashChange)

		return () => window.removeEventListener('hashchange', onHashChange)
	}, [])

	return hash
}

function DemoPage({ demo }: { demo: (typeof demos)[number] }) {
	const [showCode, setShowCode] = useState(false)

	return (
		<div className="mx-auto w-full max-w-4xl space-y-8 p-6 lg:p-10">
			<div className="flex items-center justify-between">
				<Heading>{demo.name}</Heading>
				<Button variant="outline" onClick={() => setShowCode((v) => !v)}>
					{showCode ? 'Preview' : 'Code'}
				</Button>
			</div>
			<Divider />
			{showCode ? <CodeBlock code={demo.source} /> : <demo.component />}
		</div>
	)
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
				<DemoPage key={current.id} demo={current} />
			) : (
				<div className="p-6">
					<Heading>Select a component</Heading>
				</div>
			)}
		</SidebarLayout>
	)
}
