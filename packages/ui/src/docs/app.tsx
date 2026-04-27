'use client'

import { Moon, Sun } from 'lucide-react'
import { Suspense, useDeferredValue, useEffect, useRef } from 'react'
import { loadShiki } from '../components/code'
import { Heading } from '../components/heading'
import { ToggleIconButton } from '../components/toggle-icon-button'
import { SidebarLayout } from '../layouts'
import { SidebarContent } from './components/sidebar'
import { DemoPage } from './demo-page'
import { useHash } from './hooks/use-hash'
import { useTheme } from './hooks/use-theme'
import { demos, preloadDemo } from './registry'

export function App() {
	const route = useHash()

	// Defers the route while the next demo's chunk is in flight, so the
	// previous demo stays on screen instead of flashing to a Suspense
	// fallback during navigation.
	const deferredRoute = useDeferredValue(route)

	const [dark, toggleDark] = useTheme()

	const current = demos.find((d) => d.id === deferredRoute)

	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (route != null) contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)
	}, [route])

	// On idle, warm Shiki and prefetch every demo chunk so navigation never
	// waits on the network. One demo per idle tick keeps the main thread
	// responsive; hover/focus prefetch in the sidebar covers demos the user
	// reaches for before the idle sweep finishes.
	useEffect(() => {
		const ric = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1))

		const cic = window.cancelIdleCallback ?? clearTimeout

		let cancelled = false

		let handle: number = 0

		const queue = [() => loadShiki(), ...demos.map((d) => () => preloadDemo(d.id))]

		let i = 0

		const pump = () => {
			if (cancelled || i >= queue.length) return

			queue[i++]?.()

			handle = ric(pump) as number
		}

		handle = ric(pump) as number

		return () => {
			cancelled = true

			cic(handle)
		}
	}, [])

	return (
		<SidebarLayout
			stickyHeader
			actions={
				<ToggleIconButton
					pressed={dark}
					icon={<Moon />}
					activeIcon={<Sun />}
					onClick={toggleDark}
					aria-label="Toggle dark mode"
				/>
			}
			sidebar={<SidebarContent route={route} />}
		>
			<div ref={contentRef}>
				{current ? (
					<Suspense fallback={null}>
						<DemoPage key={current.id} demo={current} />
					</Suspense>
				) : (
					<div className="p-6">
						<Heading>Select a component</Heading>
					</div>
				)}
			</div>
		</SidebarLayout>
	)
}
