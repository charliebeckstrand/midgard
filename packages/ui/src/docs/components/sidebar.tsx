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
import { useOffcanvas } from '../../primitives/offcanvas'
import { demos, preloadDemo, sortedCategories } from '../registry'

export function SidebarContent({ route }: { route: string }) {
	const offcanvas = useOffcanvas()

	// Scroll the active item into view when the mobile sidebar opens
	useLayoutEffect(() => {
		if (!offcanvas) return

		const sheet = document.querySelector('[data-slot="sheet"]')

		const current = sheet?.querySelector<HTMLElement>('[data-current]')

		current?.scrollIntoView({ block: 'center', behavior: 'auto' })
	}, [offcanvas])

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>UI Components</Heading>
			</SidebarHeader>
			<Combobox<string>
				placeholder="Search components"
				selectable={false}
				onChange={(id) => {
					if (!id) return

					window.location.hash = id

					// Scroll the matching sidebar item into view
					const sidebar = document.querySelector('[data-slot="sidebar"]')

					const item = sidebar?.querySelector<HTMLElement>(`[href="#${id}"]`)

					item?.scrollIntoView({ block: 'center', behavior: 'smooth' })

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
							<SidebarItem
								key={demo.id}
								href={`#${demo.id}`}
								current={route === demo.id}
								onClick={() => preloadDemo(demo.id)}
							>
								<SidebarLabel>{demo.name}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarSection>
				))}
			</SidebarBody>
		</Sidebar>
	)
}
