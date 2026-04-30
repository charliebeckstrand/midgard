'use client'

import { useLayoutEffect } from 'react'
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
import { useOffcanvas } from '../../primitives/offcanvas'
import { demos, preloadDemo, sortedCategories } from '../registry'

export function SidebarContent({ route }: { route: string }) {
	const offcanvas = useOffcanvas()

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
				<Heading level={2}>UI Components</Heading>
			</SidebarHeader>
			<Combobox<string>
				id="component-search"
				placeholder="Search components"
				autoComplete="off"
				selectable={false}
				onChange={(id) => {
					if (!id) return

					window.location.hash = id

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
				<div className="flex flex-col gap-2">
					{sortedCategories.map(([category, items]) => (
						<SidebarSection key={category}>
							<span className="px-2 text-zinc-500 mb-2">{category}</span>
							{items.map((demo) => {
								const prefetch = () => preloadDemo(demo.id)

								return (
									<SidebarItem
										key={demo.id}
										href={`#${demo.id}`}
										current={route === demo.id}
										onClick={prefetch}
										onMouseEnter={prefetch}
										onFocus={prefetch}
									>
										<SidebarLabel>{demo.name}</SidebarLabel>
									</SidebarItem>
								)
							})}
						</SidebarSection>
					))}
				</div>
			</SidebarBody>
		</Sidebar>
	)
}
