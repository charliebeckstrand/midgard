'use client'

import { ChevronDown, ChevronRight, Moon, Sun } from 'lucide-react'
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
import {
	buildResolutionContext,
	type ComponentApi,
	type PropDef,
	parsePublicExports,
	parseSource,
} from './parse-props'

type DemoModule = {
	default: React.ComponentType
	meta?: { name?: string; category?: string }
}

const modules = import.meta.glob<DemoModule>('./demos/*.tsx', { eager: true })

// Import all component source files for prop extraction.
// Primitives are included so cross-module type refs (e.g. PolymorphicProps) resolve.
const componentSources = import.meta.glob<string>(
	[
		'../components/**/*.{ts,tsx}',
		'../layouts/*.{ts,tsx}',
		'../pages/*.{ts,tsx}',
		'../primitives/*.{ts,tsx}',
	],
	{
		eager: true,
		query: '?raw',
		import: 'default',
	},
)

const indexSources = import.meta.glob<string>('../components/*/index.ts', {
	eager: true,
	query: '?raw',
	import: 'default',
})

/**
 * Build API metadata per component directory. Returns an ordered list of
 * publicly-exported components (from each directory's `index.ts`), each
 * enriched with parsed props + pass-through metadata.
 */
function buildComponentApis(): Record<string, ComponentApi[]> {
	// Sources grouped by component directory
	const byDir: Record<string, string[]> = {}
	// Global pool of sources for cross-module type resolution
	const allSources: string[] = []

	for (const [path, source] of Object.entries(componentSources)) {
		allSources.push(source as string)

		const match = path.match(/\.\.\/components\/([^/]+)\//)
		if (!match?.[1]) continue

		const dir = match[1]
		if (!byDir[dir]) byDir[dir] = []
		byDir[dir].push(source as string)
	}

	const sharedCtx = buildResolutionContext(allSources)

	const apis: Record<string, ComponentApi[]> = {}

	for (const [dir, sources] of Object.entries(byDir)) {
		const combined = sources.join('\n')
		const parsed = parseSource(combined, sharedCtx)
		const parsedByName = new Map(parsed.map((api) => [api.name, api]))

		// Preserve the declaration order from index.ts so the API Reference
		// matches how users see components organized in the public API.
		const indexSource = indexSources[`../components/${dir}/index.ts`]
		const publicNames = indexSource
			? parsePublicExports(indexSource)
			: parsed.map((api) => api.name)

		const entries: ComponentApi[] = []
		for (const name of publicNames) {
			entries.push(parsedByName.get(name) ?? { name, props: [] })
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

/** Split a type expression on top-level `|`, respecting nesting and strings. */
function splitUnion(type: string): string[] {
	const parts: string[] = []
	let depth = 0
	let inString: string | null = null
	let current = ''

	for (let i = 0; i < type.length; i++) {
		const ch = type[i]

		if (inString) {
			current += ch
			if (ch === inString && type[i - 1] !== '\\') inString = null
			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch
			current += ch
			continue
		}

		if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (ch === '>' && type[i - 1] !== '=') depth--

		if (ch === '|' && depth === 0) {
			if (current.trim()) parts.push(current.trim())
			current = ''
			continue
		}

		current += ch
	}
	if (current.trim()) parts.push(current.trim())
	return parts
}

function TypeBadges({ type }: { type: string }) {
	const parts = splitUnion(type)
	return (
		<div className="flex flex-wrap items-center gap-1">
			{parts.map((t) => (
				<Badge key={t} color="zinc" className="dark:text-white">
					{t.replace(/^'|'$/g, '')}
				</Badge>
			))}
		</div>
	)
}

/**
 * Renders the Type cell of the props table. When the prop has no breakdown
 * it's shown as plain badges; when a breakdown exists the cell becomes a
 * toggle button that reveals the expanded form on click.
 */
function TypeCell({ type, breakdown }: { type: string; breakdown?: string }) {
	const [expanded, setExpanded] = useState(false)

	if (!breakdown) {
		return <TypeBadges type={type} />
	}

	return (
		<div className="space-y-1.5">
			<button
				type="button"
				aria-expanded={expanded}
				onClick={() => setExpanded((v) => !v)}
				className="group flex cursor-pointer items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			>
				<TypeBadges type={type} />
				<Icon
					icon={<ChevronDown />}
					className={`size-4 text-zinc-400 transition-transform dark:text-zinc-500 ${
						expanded ? 'rotate-180' : ''
					}`}
				/>
			</button>
			{expanded && (
				<div className="flex items-start gap-1.5 border-zinc-200 border-l pl-2 text-xs dark:border-zinc-800">
					<TypeBadges type={breakdown} />
				</div>
			)}
		</div>
	)
}

function PropRowsTable({ rows }: { rows: PropDef[] }) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader>Prop</TableHeader>
					<TableHeader>Type</TableHeader>
					<TableHeader>Default</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((prop) => (
					<TableRow key={prop.name}>
						<TableCell className="font-mono font-medium align-top">{prop.name}</TableCell>
						<TableCell>
							<TypeCell type={prop.type} breakdown={prop.breakdown} />
						</TableCell>
						<TableCell className="font-mono text-zinc-500 dark:text-zinc-400 align-top">
							{prop.default ?? '—'}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

function PropsTable({ api }: { api: ComponentApi[] }) {
	return (
		<div className="space-y-8">
			{api.map((entry) => {
				const visibleProps = entry.props.filter((p) => p.type !== 'never')
				const events = visibleProps.filter((p) => /^on[A-Z]/.test(p.name))
				const props = visibleProps.filter((p) => !/^on[A-Z]/.test(p.name))
				const passThrough = entry.passThrough ?? []

				return (
					<div key={entry.name} className="space-y-3">
						<Heading level={3} className="font-mono">{`<${entry.name} />`}</Heading>
						{visibleProps.length === 0 ? (
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								This component accepts no explicit props.
							</p>
						) : (
							<div className="space-y-6">
								{props.length > 0 && (
									<div className="space-y-3">
										<Heading level={4}>Props</Heading>
										<PropRowsTable rows={props} />
									</div>
								)}
								{events.length > 0 && (
									<div className="space-y-3">
										<Heading level={4}>Events</Heading>
										<PropRowsTable rows={events} />
									</div>
								)}
							</div>
						)}
						{passThrough.length > 0 && (
							<div className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
								<span>Also accepts all</span>
								{passThrough.map((pt, i) => (
									<span key={pt.element} className="flex items-center gap-1.5">
										<Badge color="zinc" className="font-mono dark:text-white">
											{`<${pt.element}>`}
										</Badge>
										{i < passThrough.length - 1 && <span>,</span>}
									</span>
								))}
								<span>HTML attributes.</span>
							</div>
						)}
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

		current?.scrollIntoView({ block: 'center', behavior: 'auto' })
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
