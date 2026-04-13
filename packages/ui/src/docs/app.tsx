'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Heading } from '../components/heading'
import { Navbar } from '../components/navbar'
import { Spacer } from '../components/spacer'
import { ToggleIconButton } from '../components/toggle-icon-button'
import { SidebarLayout } from '../layouts'
import { SidebarContent } from './components/sidebar'
import { DemoPage } from './demo-page'
import { useHash } from './hooks/use-hash'
import { useTheme } from './hooks/use-theme'
import { demos } from './registry'

export function App() {
	const route = useHash()

	const [dark, toggleDark] = useTheme()

	const current = demos.find((d) => d.id === route)

	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (route != null) contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)
	}, [route])

	return (
		<SidebarLayout
			actions={
				<ToggleIconButton
					pressed={dark}
					icon={<Moon />}
					activeIcon={<Sun />}
					onClick={toggleDark}
					aria-label="Toggle dark mode"
				/>
			}
			navbar={
				<Navbar>
					<Spacer />
					<ToggleIconButton
						pressed={dark}
						icon={<Moon />}
						activeIcon={<Sun />}
						onClick={toggleDark}
						aria-label="Toggle dark mode"
					/>
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
