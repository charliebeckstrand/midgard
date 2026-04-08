'use client'

import { ChevronRight, Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '../components/badge'
import { Button } from '../components/button'
import { Combobox, ComboboxOption } from '../components/combobox'
import { Disclosure, DisclosureButton, DisclosurePanel } from '../components/disclosure'
import { Divider } from '../components/divider'
import { Heading } from '../components/heading'
import { Icon } from '../components/icon'
import { Navbar, NavbarSpacer } from '../components/navbar'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from '../components/sidebar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/table'
import { useOffcanvas } from '../core/offcanvas-context'
import { SidebarLayout } from '../layouts'
import { type ComponentApi, parseSource } from './parse-props'

type DemoModule = {
	default: React.ComponentType
	meta?: { name?: string; category?: string }
}

const modules = import.meta.glob<DemoModule>('./demos/*.tsx', { eager: true })

// Import all component source files for prop extraction
const componentSources = import.meta.glob<string>(
	['../components/**/*.{ts,tsx}', '../layouts/*.{ts,tsx}', '../pages/*.{ts,tsx}'],
	{
		eager: true,
		query: '?raw',
		import: 'default',
	},
)

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

		const api = componentApis[id]

		return { id, name, category, component: mod.default, api }
	})
	.sort((a, b) => a.name.localeCompare(b.name))

const categories = demos.reduce<Record<string, typeof demos>>((acc, demo) => {
	if (!acc[demo.category]) acc[demo.category] = []

	acc[demo.category]?.push(demo)

	return acc
}, {})

const categoryOrder = [
	'Base',
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
						<Heading level={3}>{`<${label} />`}</Heading>
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

function DemoPage({ demo }: { demo: (typeof demos)[number] }) {
	return (
		<div className="mx-auto w-full space-y-6 px-2 lg:p-6 lg:px-6">
			<Heading>{demo.name}</Heading>
			<demo.component />
			{demo.api && (
				<>
					<Divider />
					<Disclosure>
						<DisclosureButton className="-mt-4 -ml-2">
							<Icon
								icon={<ChevronRight />}
								className="transition-transform in-data-open:rotate-90"
							/>
							API Reference
						</DisclosureButton>
						<DisclosurePanel>
							<div className="pt-4">
								<PropsTable api={demo.api} />
							</div>
						</DisclosurePanel>
					</Disclosure>
				</>
			)}
		</div>
	)
}

function useDarkMode() {
	const [dark, setDark] = useState(() => {
		const stored = localStorage.getItem('theme')

		if (stored) return stored === 'dark'

		return window.matchMedia('(prefers-color-scheme: dark)').matches
	})

	useEffect(() => {
		document.documentElement.classList.toggle('dark', dark)

		localStorage.setItem('theme', dark ? 'dark' : 'light')
	}, [dark])

	const toggle = useCallback(() => setDark((d) => !d), [])

	return [dark, toggle] as const
}

function SidebarContent({ route }: { route: string }) {
	const offcanvas = useOffcanvas()

	// Scroll the active item into view when the mobile sidebar opens
	useEffect(() => {
		if (!offcanvas) return

		const sheet = document.querySelector('[data-slot="sheet"]')

		const current = sheet?.querySelector<HTMLElement>('[data-current]')
		current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
	}, [offcanvas])

	return (
		<Sidebar>
			<SidebarHeader className="">
				<SidebarItem href="#">
					<SidebarLabel className="font-semibold">UI Components</SidebarLabel>
				</SidebarItem>
			</SidebarHeader>
			<Combobox
				placeholder="Search components"
				selectable={false}
				onChange={(id: string) => {
					window.location.hash = id

					// Scroll the matching sidebar item into view
					const sidebar = document.querySelector('[data-slot="sidebar"]')

					const item = sidebar?.querySelector<HTMLElement>(`[href="#${id}"]`)

					item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

					offcanvas?.close()
				}}
			>
				{(query) => {
					const q = query.toLowerCase()

					return demos
						.filter((d) => !q || d.name.toLowerCase().includes(q))
						.map((d) => (
							<ComboboxOption key={d.id} value={d.id}>
								{d.name}
							</ComboboxOption>
						))
				}}
			</Combobox>
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
	)
}

export function App() {
	const route = useHash()

	const [dark, toggleDark] = useDarkMode()

	const current = demos.find((d) => d.id === route)

	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (route != null) contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)
	}, [route])

	return (
		<SidebarLayout
			actions={
				<Button variant="plain" onClick={toggleDark} aria-label="Toggle dark mode">
					{dark ? <Icon icon={<Sun />} /> : <Icon icon={<Moon />} />}
				</Button>
			}
			navbar={
				<Navbar>
					<NavbarSpacer />
					<Button variant="plain" onClick={toggleDark} aria-label="Toggle dark mode">
						{dark ? <Icon icon={<Sun />} /> : <Icon icon={<Moon />} />}
					</Button>
				</Navbar>
			}
			sidebar={<SidebarContent route={route} />}
		>
			<div ref={contentRef}>
				{current ? (
					<DemoPage key={current.id} demo={current} />
				) : (
					<div className="p-6">
						<Heading>Select a component</Heading>
					</div>
				)}
			</div>
		</SidebarLayout>
	)
}
