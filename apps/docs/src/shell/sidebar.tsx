import { ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { use, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Combobox, ComboboxOption, useComboboxQuery } from 'ui/combobox'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { useScrollWithin } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { useDensity } from 'ui/primitives/density'
import { OffcanvasContext } from 'ui/primitives/offcanvas'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	SidebarSection,
} from 'ui/sidebar'
import { Text } from 'ui/text'
import type { DocMeta } from '../engine/contracts'
import { docs, preloadDoc } from './registry'
import { navigate } from './router'

const SEARCH_PAGE_SIZE = 20

// Section-label horizontal inset, by density size. Aligns the label text with
// item text; mirrors the `ui` sidebar kata's `section.label` stops without
// reaching into ui's private recipe surface.
const SECTION_LABEL_PX: Record<string, string> = {
	sm: 'px-[calc(--spacing(1.5)-1px)]',
	md: 'px-[calc(--spacing(2)-1px)]',
	lg: 'px-[calc(--spacing(2.5)-1px)]',
}

/** Title-case a hyphenated identifier: 'components' → 'Components', 'data-display' → 'Data Display'. */
export function titleCase(s: string): string {
	return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Categories present in the doc set, rendered top to bottom: 'components'
// first, then any others alphabetically. Derived from the docs themselves so a
// library can introduce new groups (a new `content/` subfolder) without
// touching the chrome.
function orderedCategories(list: readonly DocMeta[]): string[] {
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

	const filtered = docs.filter((d) => !q || d.name.toLowerCase().includes(q))

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

function DocItem({ doc, current }: { doc: DocMeta; current: boolean }) {
	const prefetch = () => preloadDoc(doc.id)

	return (
		<SidebarItem
			href={`#/${doc.id}`}
			current={current}
			onClick={(event) => {
				// Prevent the browser's default hash-link scroll; the deferredRoute
				// effect scrolls to top after the new doc commits.
				event.preventDefault()

				prefetch()

				navigate(doc.id)
			}}
			onMouseEnter={prefetch}
			onFocus={prefetch}
		>
			<SidebarLabel>{doc.name}</SidebarLabel>
		</SidebarItem>
	)
}

type SortDirection = 'asc' | 'desc'

export function SidebarContent({ route }: { route: string }) {
	const id = useId()

	const offcanvas = use(OffcanvasContext)

	const scrollWithin = useScrollWithin()

	// Aligns each section label with item text at the active density.
	const { size } = useDensity()

	const [searchLimit, setSearchLimit] = useState(SEARCH_PAGE_SIZE)

	const [direction, setDirection] = useState<SortDirection>('asc')

	// `docs` is name-sorted ascending; 'asc' shows it as-is, 'desc' reverses.
	const sorted = direction === 'asc' ? docs : [...docs].reverse()

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
						onValueChange={(docId) => {
							if (!docId) return

							navigate(docId)

							// Scroll the matching sidebar item into view
							const sidebar = document.querySelector('[data-slot="sidebar"]')

							const item = sidebar?.querySelector<HTMLElement>(`[href="#/${docId}"]`)

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
					aria-label={direction === 'asc' ? 'Sort Z to A' : 'Sort A to Z'}
					onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}
				>
					<Icon icon={direction === 'asc' ? <ArrowDownAZ /> : <ArrowUpZA />} />
				</Button>
			</Flex>
			{/* Reversing the keyed list moves every item; without this the browser's
			    scroll anchoring follows a visible item to its mirrored position
			    instead of keeping the scroller where it is. */}
			<SidebarBody className="[overflow-anchor:none]">
				{orderedCategories(sorted).map((category) => {
					const items = sorted.filter((doc) => doc.category === category)

					if (items.length === 0) return null

					const label = titleCase(category)

					return (
						<SidebarSection key={category}>
							<Text
								severity="muted"
								className={cn('mb-2 text-sm uppercase tracking-wide', SECTION_LABEL_PX[size])}
							>
								{label}
							</Text>
							<SidebarList aria-label={label}>
								{items.map((doc) => (
									<DocItem key={doc.id} doc={doc} current={route === doc.id} />
								))}
							</SidebarList>
						</SidebarSection>
					)
				})}
			</SidebarBody>
		</Sidebar>
	)
}
