import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { type ComponentType, Suspense, use, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/button'
import { loadShiki } from '../../components/code'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { SidebarLayout, SidebarLayoutHeader } from '../../layouts'
import type { LinkProps } from '../../primitives/link'
import { AppearanceProvider, AppearanceSettings } from '../../providers/appearance'
import { UIProvider } from '../../providers/ui'
import { Flex } from '../../structure/flex'
import { SidebarContent } from './components/sidebar'
import { DebugActions } from './debug/debug-actions'
import { type TrackedPromise, tracked } from './debug/tracked'
import { type Page, pageAt } from './pages'

// The grammars that the warm-up loads in the worker of `CodeBlock`, one per
// idle slice: `tsx` for a derived code block, and `ts`, which a fence in
// Markdown and in a TSDoc description uses. The worker loads them off the main
// thread, so the warm-up does not block the page.
const WARM_LANGS = ['tsx', 'ts'] as const

// The Debug section of the settings is a separate chunk, so the entry chunk
// does not carry it. The app loads it on idle, before the reader can open the
// dialog. If the dialog opens first, the section suspends until the chunk loads.
// A chunk that fails to load gives `null`, and the dialog then shows no section.
const debugSettings: Map<string, TrackedPromise<ComponentType | null>> = new Map()

function loadDebugSettings(): Promise<ComponentType | null> {
	return tracked(debugSettings, 'settings', () =>
		import('./debug/debug-settings').then(
			({ DebugSettings }) => DebugSettings,
			() => null,
		),
	)
}

/**
 * Renders the Debug section when its chunk is ready. A `lazy` component
 * suspends on its first render even when the chunk is ready, and then the
 * section shows after the dialog lays out.
 */
function DebugSection() {
	const DebugSettings = use(loadDebugSettings())

	return DebugSettings ? <DebugSettings /> : null
}

// The library's links navigate through the router, so a page switch keeps the
// app and swaps the route in place. A link loads the scripts and the data of
// its page when the reader points at it or focuses it.
export function RouterLink({ href, ...props }: LinkProps) {
	return <Link to={href} prefetch="intent" {...props} />
}

/**
 * Root of the docs site: a sidebar layout whose body is the route, wired to the
 * persisted theme and density preferences. The router keeps the previous page
 * on screen while the next demo's chunk loads.
 */
export function App({ pages }: { pages: readonly Page[] }) {
	const { pathname, hash } = useLocation()

	const navigate = useNavigate()

	const current = pageAt(pages, pathname)

	const [locked, setLocked] = useState(true)

	// A link from before path routes (`/#stepper`) moves to the path of its page.
	useEffect(() => {
		const page = pathname === '/' && pages.find((candidate) => `#${candidate.id}` === hash)

		if (page) navigate(page.path, { replace: true })
	}, [pathname, hash, pages, navigate])

	// Start the Shiki worker on idle and load the warm grammars in it, so the
	// first "Show code" does not wait for the chunks. Per-demo prefetch happens
	// via sidebar hover/focus.
	useEffect(() => {
		const ric = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1))

		const cic = window.cancelIdleCallback ?? clearTimeout

		let handle: number

		let cancelled = false

		ric(() => {
			loadDebugSettings()
		})

		const warm = (index: number) => {
			handle = ric(() => {
				const lang = WARM_LANGS[index]

				if (cancelled || lang === undefined) return

				// A warm prefetch; a failed chunk fetch (offline, post-deploy 404) is
				// harmless here — CodeBlock asks the worker again when it renders and
				// shows its plain fallback — so swallow the rejection rather than
				// leaking it.
				loadShiki(lang).then(
					() => {
						if (!cancelled) warm(index + 1)
					},
					() => {},
				)
			}) as number
		}

		warm(0)

		return () => {
			cancelled = true

			cic(handle)
		}
	}, [])

	return (
		<UIProvider link={RouterLink}>
			<AppearanceProvider>
				<SidebarLayout
					stickyHeader
					floating={!locked}
					actions={
						<>
							<DebugActions />
							<AppearanceSettings>
								<Suspense fallback={null}>
									<DebugSection />
								</Suspense>
							</AppearanceSettings>
						</>
					}
					sidebar={<SidebarContent pages={pages} current={current} />}
				>
					{/* A navigation is a transition, so the header and the next page show
					    together when the chunk of the page is ready. */}
					{current && (
						<SidebarLayoutHeader>
							<Flex align="center" gap="md">
								<Button
									variant="bare"
									className="max-lg:hidden"
									aria-label={locked ? 'Float sidebar' : 'Lock sidebar'}
									onClick={() => setLocked(!locked)}
								>
									<Icon icon={locked ? <PanelLeftDashed /> : <PanelLeft />} />
								</Button>
								<Heading>{current.name}</Heading>
							</Flex>
						</SidebarLayoutHeader>
					)}
					<Suspense fallback={null}>
						<Outlet />
					</Suspense>
				</SidebarLayout>
			</AppearanceProvider>
		</UIProvider>
	)
}
