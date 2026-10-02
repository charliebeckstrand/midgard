'use client'

import { Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { loadShiki } from '../../components/code'
import { Heading } from '../../components/heading'
import { SidebarLayout } from '../../layouts'
import { AppearanceProvider, AppearanceSettings } from '../../providers/appearance'
import { DemoErrorBoundary, DemoLoadError } from './components/error-boundary'
import { SidebarContent } from './components/sidebar'
import { DebugActions, DebugSettings } from './debug'
import { DemoPage } from './demo-page'
import { useHash } from './hooks/use-hash'
import { demos, retryDemo } from './registry'

// Snippets in the shape of a derived code block. The browser compiles each
// grammar RegExp when the tokenizer first runs it, and that compile is most of
// the cost of a first highlight. The warm-up tokenizes one snippet per idle
// slice, so each slice stays short.
const WARM_SNIPPETS = [
	`import { Select, type SelectOption } from 'ui/select'`,
	`const options: SelectOption<string>[] = [{ value: 'a', label: \`Beta \${1 + 2}\`, disabled: false }]`,
	`export function Demo({ label = 'Pick' }: { label?: string }) {\n\tconst [value, setValue] = useState<string | null>(null)\n}`,
	`// Reset on click.\n<Button color="blue" size={2} disabled={!value} onClick={() => setValue(null)}>\n\t{value ?? label}\n</Button>`,
	`<>\n\t<Select options={options} value={value} onChange={(next) => setValue(next)} />\n</>`,
]

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

	const [locked, setLocked] = useState(true)

	const toggleLocked = useCallback(() => setLocked((l) => !l), [])

	const current = demos.find((d) => d.id === deferredRoute)

	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		// Scroll to the top on each route change; skip the empty landing route
		// (`useHash` returns '' there, never null). From `lg` up the content pane
		// scrolls, and below `lg` the page scrolls.
		if (!deferredRoute) return

		contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)

		window.scrollTo(0, 0)
	}, [deferredRoute])

	// Warm Shiki on idle, then tokenize the warm snippets one per idle slice, so
	// the first "Show code" does not pay for the grammar compile. Per-demo
	// prefetch happens via sidebar hover/focus.
	useEffect(() => {
		const ric = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1))

		const cic = window.cancelIdleCallback ?? clearTimeout

		let handle: number

		let cancelled = false

		const warm = (index: number) => {
			handle = ric(() => {
				// A warm prefetch; a failed chunk fetch (offline, post-deploy 404) is
				// harmless here — CodeBlock re-invokes loadShiki on render and shows its
				// plain fallback — so swallow the rejection rather than leaking it.
				loadShiki()
					.then(({ codeToHtml }) => {
						const snippet = WARM_SNIPPETS[index]

						if (cancelled || snippet === undefined) return

						return codeToHtml(snippet, { lang: 'tsx', theme: 'github-dark-default' }).then(() => {
							if (!cancelled) warm(index + 1)
						})
					})
					.catch(() => {})
			}) as number
		}

		warm(0)

		return () => {
			cancelled = true

			cic(handle)
		}
	}, [])

	return (
		<AppearanceProvider>
			<SidebarLayout
				stickyHeader
				floating={!locked}
				actions={
					<>
						<DebugActions />
						<AppearanceSettings>
							<DebugSettings />
						</AppearanceSettings>
					</>
				}
				sidebar={<SidebarContent route={route} />}
			>
				<div ref={contentRef}>
					{/* One Suspense boundary spans every route. Keeping it mounted, rather
					    than keyed per demo, is what lets the deferred route hold the previous
					    demo on screen while the next chunk loads. A boundary recreated per
					    navigation has no revealed content to keep, and flashes its fallback
					    instead. The error boundary stays keyed so a load failure resets per
					    demo. */}
					<Suspense fallback={null}>
						{current ? (
							<DemoErrorBoundary
								key={current.id}
								fallback={(retry) => (
									<DemoLoadError
										onRetry={() => {
											retryDemo(current.id)

											retry()
										}}
									/>
								)}
							>
								<DemoPage demo={current} locked={locked} onToggleLocked={toggleLocked} />
							</DemoErrorBoundary>
						) : (
							<div className="p-6">
								<Heading>Select a component</Heading>
							</div>
						)}
					</Suspense>
				</div>
			</SidebarLayout>
		</AppearanceProvider>
	)
}
