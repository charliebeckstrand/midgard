'use client'

import { Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { loadShiki } from '../../components/code'
import { Heading } from '../../components/heading'
import { Text } from '../../components/text'
import { SidebarLayout } from '../../layouts'
import { DensityProvider } from '../../providers/density'
import { jumpTo } from './components/demo-nav'
import { DemoErrorBoundary, DemoLoadError } from './components/error-boundary'
import { SettingsDialog } from './components/settings-dialog'
import { SidebarContent } from './components/sidebar'
import { DemoPage } from './demo-page'
import { useDensity } from './hooks/use-density'
import { useTheme } from './hooks/use-theme'
import { resolveRoute } from './registry'
import { usePathname } from './router'

/**
 * Root of the docs site: a sidebar layout whose body is the path-routed demo,
 * wired to the persisted theme and density preferences. Defers the pathname
 * during navigation so the previous page stays on screen while the next
 * chunk loads.
 */
export function App() {
	const pathname = usePathname()

	// Defers the path while the next page's chunks are in flight; the previous
	// page stays on screen during navigation.
	const deferredPathname = useDeferredValue(pathname)

	const route = resolveRoute(deferredPathname)

	// The sidebar highlights the live route, not the deferred one, so the
	// selection moves on click rather than after the chunk lands.
	const liveRoute = resolveRoute(pathname)

	const [mode, setMode] = useTheme()

	const [density, setDensity] = useDensity()

	const [locked, setLocked] = useState(true)

	const toggleLocked = useCallback(() => setLocked((l) => !l), [])

	const contentRef = useRef<HTMLDivElement>(null)

	const demoId = route?.demo.id

	const tab = route?.tab

	useEffect(() => {
		// Both route coordinates gate the reset: a demo change and a tab change
		// each land a new page.
		if (demoId === undefined || tab === undefined) return

		// An example hash deep-links into the committed page; without one, each
		// route lands at the top of the content pane.
		const slug = window.location.hash.slice(1)

		if (slug) {
			jumpTo(slug)
		} else {
			contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)
		}
	}, [demoId, tab])

	// A live hash change (an address-bar edit, a plain `#anchor` link) is a
	// same-document navigation: no route change, no remount — only this event.
	// Jump manually so the example still lands offset under the sticky header.
	useEffect(() => {
		const onHashChange = () => {
			const slug = window.location.hash.slice(1)

			if (slug) jumpTo(slug)
		}

		window.addEventListener('hashchange', onHashChange)

		return () => window.removeEventListener('hashchange', onHashChange)
	}, [])

	// The tab's title tracks the route: deepest segment first.
	useEffect(() => {
		if (!route) {
			document.title = 'Docs'

			return
		}

		const tabName = route.tab ? route.demo.tabs.find((t) => t.slug === route.tab)?.name : undefined

		document.title = [tabName, route.demo.name, 'Docs'].filter(Boolean).join(' · ')
	}, [route])

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
				sidebar={<SidebarContent route={liveRoute?.demo.id ?? ''} />}
			>
				<div ref={contentRef}>
					{route ? (
						<DemoErrorBoundary
							key={route.demo.id}
							fallback={(retry) => <DemoLoadError onRetry={retry} />}
						>
							<Suspense fallback={null}>
								<DemoPage
									demo={route.demo}
									tab={route.tab}
									locked={locked}
									onToggleLocked={toggleLocked}
								/>
							</Suspense>
						</DemoErrorBoundary>
					) : (
						<div className="p-6 space-y-2">
							<Heading>Page not found</Heading>
							<Text severity="muted">
								No demo lives at this address; pick one from the sidebar.
							</Text>
						</div>
					)}
				</div>
			</SidebarLayout>
		</DensityProvider>
	)
}
