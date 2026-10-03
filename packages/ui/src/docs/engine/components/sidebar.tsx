import { ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { memo, use, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/button'
import { Combobox, ComboboxOption, useComboboxDeferredQuery } from '../../../components/combobox'
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
import { OffcanvasContext } from '../../../primitives/offcanvas'
import { Flex } from '../../../structure/flex'
import { noAutofill } from '../no-autofill'
import { type Demo, demos, preloadDemo } from '../registry'
import { titleCase } from './format'

// Section-label horizontal inset at the step of the nearest density scope.
// Aligns the label text with item text; mirrors the padding of the `ui` sidebar
// item without reaching into ui's private recipe surface.
const SECTION_LABEL_PX = 'density-px-ring-[1.5,2,2.5]'

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

// About 110 names at most, so the list renders every match and needs no paging.
function SearchResults() {
	const deferredQuery = useComboboxDeferredQuery()

	const q = deferredQuery.toLowerCase()

	return demos
		.filter((d) => !q || d.name.toLowerCase().includes(q))
		.map((d) => (
			<ComboboxOption key={d.id} value={d.id}>
				{d.name}
			</ComboboxOption>
		))
}

// Memoized so a navigation re-renders only the two items whose `current`
// flipped: `demo` is a stable registry reference, leaving `current` as the sole
// changing prop across the ~110-item list.
const DemoItem = memo(function DemoItem({ demo, current }: { demo: Demo; current: boolean }) {
	const prefetch = () => preloadDemo(demo.id)

	return (
		<SidebarItem
			// A plain path link. The router makes the history entry, and the app
			// scrolls to the top when the demo shows.
			href={`/${demo.id}`}
			current={current}
			// A touch device has no hover, and a tap does not focus the link. The press
			// starts the fetch, so the demo is ready while the drawer closes.
			onPointerDown={prefetch}
			onMouseEnter={prefetch}
			onFocus={prefetch}
		>
			<SidebarLabel>{demo.name}</SidebarLabel>
		</SidebarItem>
	)
})

type SortDirection = 'asc' | 'desc'

export function SidebarContent({ route }: { route: string }) {
	const id = useId()

	const offcanvas = use(OffcanvasContext)

	const navigate = useNavigate()

	const scrollWithin = useScrollWithin()

	const [direction, setDirection] = useState<SortDirection>('asc')

	// `demos` is name-sorted ascending; 'asc' shows it as-is, 'desc' reverses.
	// Memoized so category ordering and per-category filtering recompute only when
	// the sort direction flips, not on every navigation or lock toggle.
	const sections = useMemo(() => {
		const sorted = direction === 'asc' ? demos : [...demos].reverse()

		return orderedCategories(sorted)
			.map((category) => ({
				category,
				label: titleCase(category),
				items: sorted.filter((demo) => demo.category === category),
			}))
			.filter((section) => section.items.length > 0)
	}, [direction])

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>Docs</Heading>
			</SidebarHeader>
			<Flex gap="sm">
				{/* The search gets no autofill and no typing suggestions. */}
				<div ref={noAutofill} className="flex-1">
					<Combobox<string>
						id={`${id}-search-docs`}
						placeholder="Search docs"
						autoComplete="off"
						// Controlled empty: selecting a result navigates via onValueChange
						// without the search box retaining the picked option.
						value=""
						onValueChange={(id) => {
							if (!id) return

							// The same navigation as a click on a sidebar link.
							navigate(`/${id}`)

							// Scroll the matching sidebar item into view
							const sidebar = document.querySelector('[data-slot="sidebar"]')

							const item = sidebar?.querySelector<HTMLElement>(`[href="/${id}"]`)

							if (item) scrollWithin(item, { block: 'center', behavior: 'smooth' })

							offcanvas?.close()
						}}
					>
						<SearchResults />
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
			{/* Reversing the keyed list moves every item. Without this the browser's
			    scroll anchoring follows a visible item to its mirrored position,
			    instead of keeping the scroller where it is. */}
			<SidebarBody className="[overflow-anchor:none]">
				{sections.map(({ category, label, items }) => (
					<SidebarSection key={category}>
						<Text
							tone="muted"
							className={cn('mb-2 text-sm uppercase tracking-wide', SECTION_LABEL_PX)}
						>
							{label}
						</Text>
						<SidebarList aria-label={label}>
							{items.map((demo) => (
								<DemoItem key={demo.id} demo={demo} current={route === demo.id} />
							))}
						</SidebarList>
					</SidebarSection>
				))}
			</SidebarBody>
		</Sidebar>
	)
}
