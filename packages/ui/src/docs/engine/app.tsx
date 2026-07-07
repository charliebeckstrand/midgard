'use client'

import { Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { loadShiki } from '../../components/code'
import { Heading } from '../../components/heading'
import { SidebarLayout } from '../../layouts'
import { DensityProvider } from '../../providers/density'
import { DemoErrorBoundary, DemoLoadError } from './components/error-boundary'
import { SettingsDialog } from './components/settings-dialog'
import { SidebarContent } from './components/sidebar'
import { DemoPage } from './demo-page'
import { useDensity } from './hooks/use-density'
import { useHash } from './hooks/use-hash'
import { useTheme } from './hooks/use-theme'
import { demos } from './registry'

/**
 * Root of the docs site: a sidebar layout whose body is the hash-routed demo,
 * wired to the persisted theme and density preferences. Defers the route during
 * navigation so the previous demo stays on screen while the next chunk loads.
 */
export function App() {
	const route = useHash()

	// Defers the route while the next demo's chunk is in flight; the previous
	// demo stays on screen during navigation.
	const deferredRoute = useDeferredValue(route)

	const [mode, setMode] = useTheme()

	const [density, setDensity] = useDensity()

	const [locked, setLocked] = useState(true)

	const toggleLocked = useCallback(() => setLocked((l) => !l), [])

	const current = demos.find((d) => d.id === deferredRoute)

	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (deferredRoute != null) contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)
	}, [deferredRoute])

	// Warm Shiki on idle. Per-demo prefetch happens via sidebar hover/focus.
	useEffect(() => {
		const ric = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1))

		const cic = window.cancelIdleCallback ?? clearTimeout

		const handle = ric(() => loadShiki()) as number

		return () => cic(handle)
	}, [])

	return (
		<DensityProvider density={density}>
			<SidebarLayout
				stickyHeader
				floating={!locked}
				actions={
					<SettingsDialog
						mode={mode}
						density={density}
						onModeChange={setMode}
						onDensityChange={setDensity}
					/>
				}
				sidebar={<SidebarContent route={route} />}
			>
				<div ref={contentRef}>
					{current ? (
						<DemoErrorBoundary
							key={current.id}
							fallback={(retry) => <DemoLoadError onRetry={retry} />}
						>
							<Suspense fallback={null}>
								<DemoPage demo={current} locked={locked} onToggleLocked={toggleLocked} />
							</Suspense>
						</DemoErrorBoundary>
					) : (
						<div className="p-6">
							<Heading>Select a component</Heading>
						</div>
					)}
				</div>
			</SidebarLayout>
		</DensityProvider>
	)
}
