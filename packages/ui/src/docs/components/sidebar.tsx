'use client'

import { ListFilter } from 'lucide-react'
import { Fragment, use, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Combobox, ComboboxOption, useComboboxQuery } from '../../components/combobox'
import { Fieldset, Label, Legend } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { Sheet, SheetBody, SheetTitle } from '../../components/sheet'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from '../../components/sidebar'
import { Stack } from '../../components/stack'
import { useScrollWithin } from '../../hooks'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { navigate } from '../hooks/use-hash'
import { type Demo, demos, preloadDemo, sortedCategories } from '../registry'

const SEARCH_PAGE_SIZE = 20

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
			onClick={(e) => {
				// Prevent the browser's default hash-link scroll;
				// the deferredRoute effect scrolls to top after
				// the new demo commits.
				e.preventDefault()

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

type SortBy = 'groups' | 'alphabetical'

type ComponentsFilter = 'server' | 'client' | 'all'

export function SidebarContent({ route }: { route: string }) {
	const id = useId()

	const offcanvas = use(OffcanvasContext)

	const scrollWithin = useScrollWithin()

	const [searchLimit, setSearchLimit] = useState(SEARCH_PAGE_SIZE)

	const [filtersOpen, setFiltersOpen] = useState(false)

	const [sortBy, setSortBy] = useState<SortBy>('groups')

	// Selection only; the registry carries no server/client metadata yet, so
	// this can't narrow the list until that exists.
	const [components, setComponents] = useState<ComponentsFilter>('all')

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
				<Heading level={2}>Components</Heading>
			</SidebarHeader>
			<Flex gap="sm">
				<div className="flex-1">
					<Combobox<string>
						id={`${id}-search-components`}
						placeholder="Search components"
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
				<Button variant="bare" aria-label="Filters" onClick={() => setFiltersOpen(true)}>
					<Icon icon={<ListFilter />} />
				</Button>
			</Flex>
			<Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
				<SheetTitle>Filters</SheetTitle>
				<SheetBody>
					<Stack gap="lg">
						<Fieldset>
							<Legend>Sort by</Legend>
							<RadioGroup aria-label="Sort by">
								<RadioField>
									<Radio
										name={`${id}-sort-by`}
										value="groups"
										checked={sortBy === 'groups'}
										onChange={() => setSortBy('groups')}
									/>
									<Label>Groups</Label>
								</RadioField>
								<RadioField>
									<Radio
										name={`${id}-sort-by`}
										value="alphabetical"
										checked={sortBy === 'alphabetical'}
										onChange={() => setSortBy('alphabetical')}
									/>
									<Label>Alphabetical</Label>
								</RadioField>
							</RadioGroup>
						</Fieldset>
						<Fieldset>
							<Legend>Components</Legend>
							<RadioGroup aria-label="Components">
								<RadioField>
									<Radio
										name={`${id}-components`}
										value="server"
										checked={components === 'server'}
										onChange={() => setComponents('server')}
									/>
									<Label>Server components</Label>
								</RadioField>
								<RadioField>
									<Radio
										name={`${id}-components`}
										value="client"
										checked={components === 'client'}
										onChange={() => setComponents('client')}
									/>
									<Label>Client components</Label>
								</RadioField>
								<RadioField>
									<Radio
										name={`${id}-components`}
										value="all"
										checked={components === 'all'}
										onChange={() => setComponents('all')}
									/>
									<Label>All components</Label>
								</RadioField>
							</RadioGroup>
						</Fieldset>
					</Stack>
				</SheetBody>
			</Sheet>
			<SidebarBody>
				<div className="flex flex-col gap-3">
					{sortBy === 'alphabetical' ? (
						<SidebarSection>
							{demos.map((demo) => (
								<DemoItem key={demo.id} demo={demo} current={route === demo.id} />
							))}
						</SidebarSection>
					) : (
						sortedCategories.map(([category, items]) => (
							<Fragment key={category}>
								<span className="text-zinc-500 leading-none px-2">{category}</span>

								<SidebarSection>
									{items.map((demo) => (
										<DemoItem key={demo.id} demo={demo} current={route === demo.id} />
									))}
								</SidebarSection>
							</Fragment>
						))
					)}
				</div>
			</SidebarBody>
		</Sidebar>
	)
}
