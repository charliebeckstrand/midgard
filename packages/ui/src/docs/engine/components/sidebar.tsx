'use client'

import { ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { use, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../../../components/button'
import { Combobox, ComboboxOption, useComboboxQuery } from '../../../components/combobox'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	SidebarSection,
} from '../../../components/sidebar'
import { Text } from '../../../components/text'
import { cn } from '../../../core'
import { useScrollWithin } from '../../../hooks'
import { useDensity } from '../../../primitives/density'
import { OffcanvasContext } from '../../../primitives/offcanvas'
import { navigate } from '../hooks/use-hash'
import { type Demo, demos, preloadDemo } from '../registry'

const SEARCH_PAGE_SIZE = 20

// Section-label horizontal inset, by density size. Aligns the label text with
// item text; mirrors the `ui` sidebar kata's `section.label` stops without
// reaching into ui's private recipe surface.
const SECTION_LABEL_PX: Record<string, string> = {
	sm: 'px-[calc(--spacing(1.5)-1px)]',
	md: 'px-[calc(--spacing(2)-1px)]',
	lg: 'px-[calc(--spacing(2.5)-1px)]',
}

// The header label for a category, derived from its key: 'components' →
// 'Components', 'pages' → 'Pages', 'data-display' → 'Data Display'.
function categoryLabel(category: string): string {
	return category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Categories present in the demo set, rendered top to bottom: 'components'
// first, then any others alphabetically. Derived from the demos themselves so a
// library can introduce new groups (a new `demos/` subfolder) without touching
// the chrome.
function orderedCategories(list: readonly Demo[]): string[] {
	const unique = [...new Set(list.map((d) => d.category))]

	return unique.sort((a, b) =>
		a === 'components' ? -1 : b === 'components' ? 1 : a.localeCompare(b),
	)
}

function SearchLoadMore({ onVisible }: { onVisible: () => void }) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const node = ref.current

		if (!node) return

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) onVisible()
			},
			{ threshold: 0 },
		)

		observer.observe(node)

		return () => observer.disconnect()
	}, [onVisible])

	return <div ref={ref} aria-hidden="true" />
}

function SearchResults({ limit, onLoadMore }: { limit: number; onLoadMore: () => void }) {
	const { deferredQuery } = useComboboxQuery()

	const q = deferredQuery.toLowerCase()

	const filtered = demos.filter((d) => !q || d.name.toLowerCase().includes(q))

	const visible = filtered.slice(0, limit)

	const hasMore = visible.length < filtered.length

	return (
		<>
			{visible.map((d) => (
				<ComboboxOption key={d.id} value={d.id}>
					{d.name}
				</ComboboxOption>
			))}
			{hasMore && <SearchLoadMore onVisible={onLoadMore} />}
		</>
	)
}

function DemoItem({ demo, current }: { demo: Demo; current: boolean }) {
	const prefetch = () => preloadDemo(demo.id)

	return (
		<SidebarItem
			href={`#${demo.id}`}
			current={current}
			onClick={(event) => {
				// Prevent the browser's default hash-link scroll;
				// the deferredRoute effect scrolls to top after
				// the new demo commits.
				event.preventDefault()

				prefetch()

				navigate(demo.id)
			}}
			onMouseEnter={prefetch}
			onFocus={prefetch}
		>
			<SidebarLabel>{demo.name}</SidebarLabel>
		</SidebarItem>
	)
}

type SortDirection = 'desc' | 'asc'

export function SidebarContent({ route }: { route: string }) {
	const id = useId()

	const offcanvas = use(OffcanvasContext)

	const scrollWithin = useScrollWithin()

	// Aligns each section label with item text at the active density.
	const { size } = useDensity()

	const [searchLimit, setSearchLimit] = useState(SEARCH_PAGE_SIZE)

	const [direction, setDirection] = useState<SortDirection>('desc')

	const sorted = direction === 'desc' ? demos : [...demos].reverse()

	// Scroll the active item into view when the mobile sidebar opens
	useLayoutEffect(() => {
		if (!offcanvas) return

		const sheet = document.querySelector('[data-slot="sheet"]')

		const current = sheet?.querySelector<HTMLElement>('[data-current]')

		if (current) scrollWithin(current, { block: 'nearest' })
	}, [offcanvas, scrollWithin])

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>Docs</Heading>
			</SidebarHeader>
			<Flex gap="sm">
				<div className="flex-1">
					<Combobox<string>
						id={`${id}-search-docs`}
						placeholder="Search docs"
						autoComplete="off"
						selectable={false}
						onQueryChange={() => setSearchLimit(SEARCH_PAGE_SIZE)}
						onOpenChange={(open) => {
							if (!open) setSearchLimit(SEARCH_PAGE_SIZE)
						}}
						onValueChange={(id) => {
							if (!id) return

							navigate(id)

							// Scroll the matching sidebar item into view
							const sidebar = document.querySelector('[data-slot="sidebar"]')

							const item = sidebar?.querySelector<HTMLElement>(`[href="#${id}"]`)

							if (item) scrollWithin(item, { block: 'center', behavior: 'smooth' })

							offcanvas?.close()
						}}
					>
						<SearchResults
							limit={searchLimit}
							onLoadMore={() => setSearchLimit((l) => l + SEARCH_PAGE_SIZE)}
						/>
					</Combobox>
				</div>
				<Button
					variant="bare"
					aria-label={direction === 'desc' ? 'Sort Z to A' : 'Sort A to Z'}
					onClick={() => setDirection(direction === 'desc' ? 'asc' : 'desc')}
				>
					<Icon icon={direction === 'desc' ? <ArrowDownAZ /> : <ArrowUpZA />} />
				</Button>
			</Flex>
			{/* Reversing the keyed list moves every item; without this the browser's
			    scroll anchoring follows a visible item to its mirrored position
			    instead of keeping the scroller where it is. */}
			<SidebarBody className="[overflow-anchor:none]">
				{orderedCategories(sorted).map((category) => {
					const items = sorted.filter((demo) => demo.category === category)

					if (items.length === 0) return null

					const label = categoryLabel(category)

					return (
						<SidebarSection key={category}>
							<Text
								severity="muted"
								className={cn('mb-2 text-sm uppercase tracking-wide', SECTION_LABEL_PX[size])}
							>
								{label}
							</Text>
							<SidebarList aria-label={label}>
								{items.map((demo) => (
									<DemoItem key={demo.id} demo={demo} current={route === demo.id} />
								))}
							</SidebarList>
						</SidebarSection>
					)
				})}
			</SidebarBody>
		</Sidebar>
	)
}
