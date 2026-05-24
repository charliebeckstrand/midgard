'use client'

import { Fragment, use, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Combobox, ComboboxOption } from '../../components/combobox'
import { Heading } from '../../components/heading'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from '../../components/sidebar'
import { useScrollWithin } from '../../hooks'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { navigate } from '../hooks/use-hash'
import { demos, preloadDemo, sortedCategories } from '../registry'

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

export function SidebarContent({ route }: { route: string }) {
	const id = useId()

	const offcanvas = use(OffcanvasContext)

	const scrollWithin = useScrollWithin()

	const [searchLimit, setSearchLimit] = useState(SEARCH_PAGE_SIZE)

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
				<Heading level={1} className="flex-1 lg:py-2">
					Components
				</Heading>
			</SidebarHeader>
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
				{(query) => {
					const q = query.toLowerCase()

					const filtered = demos.filter((d) => !q || d.name.toLowerCase().includes(q))

					const visible = filtered.slice(0, searchLimit)

					const hasMore = visible.length < filtered.length

					return (
						<>
							{visible.map((d) => (
								<ComboboxOption key={d.id} value={d.id}>
									{d.name}
								</ComboboxOption>
							))}
							{hasMore && (
								<SearchLoadMore onVisible={() => setSearchLimit((l) => l + SEARCH_PAGE_SIZE)} />
							)}
						</>
					)
				}}
			</Combobox>
			<SidebarBody>
				<div className="flex flex-col gap-3">
					{sortedCategories.map(([category, items]) => (
						<Fragment key={category}>
							<span className="text-zinc-500 leading-none px-2">{category}</span>

							<SidebarSection>
								{items.map((demo) => {
									const prefetch = () => preloadDemo(demo.id)

									return (
										<SidebarItem
											key={demo.id}
											href={`#${demo.id}`}
											current={route === demo.id}
											onClick={(e) => {
												// Prevent the browser's default hash-link scroll;
												// our deferredRoute effect handles scroll-to-top
												// after the new demo commits.
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
								})}
							</SidebarSection>
						</Fragment>
					))}
				</div>
			</SidebarBody>
		</Sidebar>
	)
}
