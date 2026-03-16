'use client'

import { useEffect, useState } from 'react'
import { Button } from '../components/button'
import { Heading, Subheading } from '../components/heading'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/table'
import { CodeBlock } from './code-block'
import { type ComponentApi, parseSource } from './parse-props'

type DemoModule = {
	default: React.ComponentType
	meta?: { name?: string; category?: string }
}

const modules = import.meta.glob<DemoModule>('./demos/*.tsx', { eager: true })
const demoSources = import.meta.glob<string>('./demos/*.tsx', {
	eager: true,
	query: '?raw',
	import: 'default',
})

// Import all component source files for prop extraction
const componentSources = import.meta.glob<string>('../components/**/*.tsx', {
	eager: true,
	query: '?raw',
	import: 'default',
})

/** Strip the `export const meta = { ... }` block and surrounding blank lines from demo source */
function stripMeta(source: string): string {
	return source.replace(/export const meta[\s\S]*?\n\}\n?\n*/m, '').trimStart()
}

/** Group component sources by directory name (e.g. "button", "badge") */
function buildComponentApis(): Record<string, ComponentApi[]> {
	const byDir: Record<string, string[]> = {}

	for (const [path, source] of Object.entries(componentSources)) {
		// path: "../components/button/button.tsx"
		const match = path.match(/\.\.\/components\/([^/]+)\//)
		if (!match) continue
		const dir = match[1]
		if (!byDir[dir]) byDir[dir] = []
		byDir[dir].push(source as string)
	}

	const apis: Record<string, ComponentApi[]> = {}
	for (const [dir, sources] of Object.entries(byDir)) {
		const entries: ComponentApi[] = []
		for (const source of sources) {
			entries.push(...parseSource(source))
		}
		if (entries.length > 0) apis[dir] = entries
	}
	return apis
}

const componentApis = buildComponentApis()

const demos = Object.entries(modules)
	.map(([path, mod]) => {
		const id = path.replace('./demos/', '').replace('.tsx', '')
		const name = mod.meta?.name ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
		const category = mod.meta?.category ?? 'Other'
		const source = stripMeta((demoSources[path] as string) ?? '')
		const api = componentApis[id]
		return { id, name, category, component: mod.default, source, api }
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

function PropsTable({ api }: { api: ComponentApi[] }) {
	return (
		<div className="space-y-8">
			{api.map((entry) => (
				<div key={entry.name} className="space-y-3">
					<Subheading>{entry.name}</Subheading>
					<Table>
						<TableHead>
							<TableRow>
								<TableHeader>Prop</TableHeader>
								<TableHeader>Type</TableHeader>
								<TableHeader>Default</TableHeader>
							</TableRow>
						</TableHead>
						<TableBody>
							{entry.props.map((prop) => (
								<TableRow key={prop.name}>
									<TableCell className="font-mono text-xs font-medium">{prop.name}</TableCell>
									<TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
										{prop.type}
									</TableCell>
									<TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
										{prop.default ?? '—'}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			))}
		</div>
	)
}

function DemoPage({ demo }: { demo: (typeof demos)[number] }) {
	const [showCode, setShowCode] = useState(false)

	return (
		<div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
			<div className="flex items-center justify-between">
				<Heading>{demo.name}</Heading>
				<Button variant="outline" onClick={() => setShowCode((v) => !v)}>
					{showCode ? 'Preview' : 'Code'}
				</Button>
			</div>
			{showCode ? <CodeBlock code={demo.source} /> : <demo.component />}
			{demo.api && <PropsTable api={demo.api} />}
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
				<div className="p-10">
					<Heading>Select a component</Heading>
				</div>
			)}
		</SidebarLayout>
	)
}
