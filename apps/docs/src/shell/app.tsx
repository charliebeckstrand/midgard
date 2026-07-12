import { Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { loadShiki } from 'ui/code'
import { Heading } from 'ui/heading'
import { SidebarLayout } from 'ui/layouts'
import { DensityProvider } from 'ui/providers/density'
import { DocPage } from './doc-page'
import { DocErrorBoundary, DocLoadError } from './error-boundary'
import { useDensity, useTheme } from './preferences'
import { docs } from './registry'
import { useRoute } from './router'
import { SettingsDialog } from './settings-dialog'
import { SidebarContent } from './sidebar'

/**
 * Root of the docs site: a sidebar layout whose body is the hash-routed doc,
 * wired to the persisted theme and density preferences. Defers the route during
 * navigation so the previous doc stays on screen while the next chunk loads.
 */
export function App() {
	const route = useRoute()

	// Defers the doc id while the next doc's chunk is in flight; the previous
	// doc stays on screen during navigation. Search params (tab, seed) stay
	// live — switching tabs must not lag behind the URL.
	const deferredId = useDeferredValue(route.id)

	const [mode, setMode] = useTheme()

	const [density, setDensity] = useDensity()

	const [locked, setLocked] = useState(true)

	const toggleLocked = useCallback(() => setLocked((l) => !l), [])

	const current = docs.find((doc) => doc.id === deferredId)

	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		// Scroll the content pane to top on each route change; skip the empty
		// landing route.
		if (deferredId) contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)
	}, [deferredId])

	// Warm Shiki on idle; every tab shows highlighted code sooner for it.
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
				sidebar={<SidebarContent route={route.id} />}
			>
				<div ref={contentRef}>
					{/* One Suspense boundary spans every route. Keeping it mounted (rather
					    than keyed per doc) is what lets the deferred route hold the previous
					    doc on screen while the next chunk loads; a boundary recreated per
					    navigation has no revealed content to keep and flashes its fallback
					    instead. The error boundary stays keyed so a load failure resets per
					    doc. */}
					<Suspense fallback={null}>
						{current ? (
							<DocErrorBoundary
								key={current.id}
								fallback={(retry) => <DocLoadError onRetry={retry} />}
							>
								<DocPage
									meta={current}
									search={route.search}
									locked={locked}
									onToggleLocked={toggleLocked}
								/>
							</DocErrorBoundary>
						) : (
							<div className="p-6">
								<Heading>Select a page</Heading>
							</div>
						)}
					</Suspense>
				</div>
			</SidebarLayout>
		</DensityProvider>
	)
}
