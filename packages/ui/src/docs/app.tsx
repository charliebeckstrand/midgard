'use client'

import { Moon, Sun } from 'lucide-react'
import { Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { loadShiki } from '../components/code'
import { Heading } from '../components/heading'
import { ToggleIconButton } from '../components/toggle-icon-button'
import { SidebarLayout } from '../layouts'
import { SidebarContent } from './components/sidebar'
import { DemoPage } from './demo-page'
import { useHash } from './hooks/use-hash'
import { useTheme } from './hooks/use-theme'
import { demos } from './registry'

export function App() {
	const route = useHash()

	// Defers the route while the next demo's chunk is in flight, so the
	// previous demo stays on screen instead of flashing to a Suspense
	// fallback during navigation.
	const deferredRoute = useDeferredValue(route)

	const [dark, toggleDark] = useTheme()

	const [locked, setLocked] = useState(true)

	const toggleLocked = useCallback(() => setLocked((l) => !l), [])

	const current = demos.find((d) => d.id === deferredRoute)

	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (deferredRoute != null) contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)
	}, [deferredRoute])

	// Warm Shiki on idle so the first code-block reveal doesn't pay the cost.
	// Per-demo prefetch happens via sidebar hover/focus — there's no need to
	// fan out to all 104 demos here.
	useEffect(() => {
		const ric = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1))

		const cic = window.cancelIdleCallback ?? clearTimeout

		const handle = ric(() => loadShiki()) as number

		return () => cic(handle)
	}, [])

	return (
		<SidebarLayout
			stickyHeader
			floating={!locked}
			actions={
				<ToggleIconButton
					pressed={dark}
					icon={<Moon />}
					activeIcon={<Sun />}
					aria-label="Toggle dark mode"
					className="p-2 -m-2"
					onClick={toggleDark}
				/>
			}
			sidebar={<SidebarContent route={route} locked={locked} onToggleLocked={toggleLocked} />}
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
