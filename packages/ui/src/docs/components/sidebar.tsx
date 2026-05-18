'use client'

import { Fragment, use, useId, useLayoutEffect } from 'react'
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

export function SidebarContent({ route }: { route: string }) {
	const id = useId()

	const offcanvas = use(OffcanvasContext)

	const scrollWithin = useScrollWithin()

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
				<div className="flex flex-col gap-md">
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
