'use client'

import { useEffect, useState } from 'react'
import { Badge } from '../components/badge'
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
import { Tab, Tabs } from '../components/tabs'
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
const componentSources = import.meta.glob<string>('../components/**/*.{ts,tsx}', {
	eager: true,
	query: '?raw',
	import: 'default',
})

/** Strip the `export const meta = { ... }` line and surrounding blank lines from demo source */
function stripMeta(source: string): string {
	return source.replace(/export const meta\s*=\s*\{[^}]*\}\s*\n\n?/m, '').trimStart()
}

/** Transform demo source into copy-pasteable usage code */
function simplifySource(source: string): string {
	// Rewrite internal component paths to package imports
	const result = source.replace(/from\s+['"]\.\.\/\.\.\/components\/([^'"]+)['"]/g, 'from "ui/$1"')

	// Extract the default export function body
	const match = result.match(
		/export default function \w+\(\) \{\n([\s\S]*?)\treturn \(\n([\s\S]*?)\n\t\)\n\}\s*$/,
	)

	if (!match) return result

	const beforeFunc = result.slice(0, result.indexOf('export default function')).trim()
	const bodyStatements = match[1].trim()
	const jsx = match[2].replace(/^\t\t/gm, '')

	const parts = [beforeFunc]

	if (bodyStatements) parts.push(bodyStatements.replace(/^\t/gm, ''))

	parts.push(jsx)

	return parts.filter(Boolean).join('\n\n')
}

/** Group component sources by directory name (e.g. "button", "badge") */
function buildComponentApis(): Record<string, ComponentApi[]> {
	const byDir: Record<string, string[]> = {}

	for (const [path, source] of Object.entries(componentSources)) {
		// path: "../components/button/button.tsx"
		const match = path.match(/\.\.\/components\/([^/]+)\//)

		if (!match?.[1]) continue

		const dir = match[1]

		if (!byDir[dir]) byDir[dir] = []

		byDir[dir].push(source as string)
	}

	const apis: Record<string, ComponentApi[]> = {}
	for (const [dir, sources] of Object.entries(byDir)) {
		// Concatenate all files so cross-file type references resolve
		const combined = sources.join('\n')

		const entries = parseSource(combined)

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

		const source = simplifySource(stripMeta((demoSources[path] as string) ?? ''))

		const api = componentApis[id]

		return { id, name, category, component: mod.default, source, api }
	})
	.sort((a, b) => a.name.localeCompare(b.name))

const categories = demos.reduce<Record<string, typeof demos>>((acc, demo) => {
	if (!acc[demo.category]) acc[demo.category] = []

	acc[demo.category]?.push(demo)

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
			{api.map((entry) => {
				const visibleProps = entry.props.filter((p) => p.type !== 'never')

				if (visibleProps.length === 0) return null

				// Format: "Button Props", "AlertActions Props"
				const label = entry.name.replace(/([a-z])([A-Z])/g, '$1\u00A0$2')

				return (
					<div key={entry.name} className="space-y-3">
						<Subheading>{`<${label} />`}</Subheading>
						<Table>
							<TableHead>
								<TableRow>
									<TableHeader>Prop</TableHeader>
									<TableHeader>Type</TableHeader>
									<TableHeader>Default</TableHeader>
								</TableRow>
							</TableHead>
							<TableBody>
								{visibleProps.map((prop) => (
									<TableRow key={prop.name}>
										<TableCell className="font-mono font-medium">{prop.name}</TableCell>
										<TableCell>
											<div className="grid grid-cols-[repeat(4,max-content)] items-center gap-1">
												{prop.type.split(' | ').map((t) => (
													<Badge key={t} color="zinc" className="dark:text-white">
														{t.replace(/^'|'$/g, '')}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell className="font-mono text-zinc-500 dark:text-zinc-400">
											{prop.default ?? '—'}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)
			})}
		</div>
	)
}

type DemoTab = 'preview' | 'code' | 'api'

function DemoPage({ demo }: { demo: (typeof demos)[number] }) {
	const [tab, setTab] = useState<DemoTab>('preview')

	return (
		<div className="mx-auto w-full space-y-6 px-6 lg:py-6">
			<Heading>{demo.name}</Heading>
			<Tabs>
				<Tab current={tab === 'preview'} onClick={() => setTab('preview')}>
					Preview
				</Tab>
				<Tab current={tab === 'code'} onClick={() => setTab('code')}>
					Code
				</Tab>
				{demo.api && (
					<Tab current={tab === 'api'} onClick={() => setTab('api')}>
						API
					</Tab>
				)}
			</Tabs>
			{tab === 'preview' && <demo.component />}
			{tab === 'code' && <CodeBlock code={demo.source} />}
			{tab === 'api' && demo.api && <PropsTable api={demo.api} />}
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
