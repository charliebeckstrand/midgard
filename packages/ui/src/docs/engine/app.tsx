import {
	type ComponentType,
	Suspense,
	use,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { Link, Outlet, useLocation, useNavigationType, useOutletContext } from 'react-router'
import { loadShiki } from '../../components/code'
import { Heading } from '../../components/heading'
import { SidebarLayout } from '../../layouts'
import type { LinkProps } from '../../primitives/link'
import { AppearanceProvider, AppearanceSettings } from '../../providers/appearance'
import { UIProvider } from '../../providers/ui'
import { DemoErrorBoundary, DemoLoadError } from './components/error-boundary'
import { SidebarContent } from './components/sidebar'
import { DebugActions } from './debug/debug-actions'
import { parseDemoPath } from './demo-id'
import { DemoPage } from './demo-page'
import { defaultDemo, demos, retryDemo, type TrackedPromise, tracked } from './registry'

// Snippets in the shape of a derived code block. The browser compiles each
// grammar RegExp when the tokenizer first runs it, and that compile is most of
// the cost of a first highlight. The warm-up tokenizes one snippet per idle
// slice. The tokenizer runs in the worker of `shiki.ts`, so the warm-up does
// not block the page. Each grammar compiles its own RegExps, so the last
// snippet warms `ts`, which a fence in Markdown and in a TSDoc description uses.
const WARM_SNIPPETS: readonly { lang: 'tsx' | 'ts'; code: string }[] = [
	{ lang: 'tsx', code: `import { Select, type SelectOption } from 'ui/select'` },
	{
		lang: 'tsx',
		code: `const options: SelectOption<string>[] = [{ value: 'a', label: \`Beta \${1 + 2}\`, disabled: false }]`,
	},
	{
		lang: 'tsx',
		code: `export function Demo({ label = 'Pick' }: { label?: string }) {\n\tconst [value, setValue] = useState<string | null>(null)\n}`,
	},
	{
		lang: 'tsx',
		code: `// Reset on click.\n<Button color="blue" size={2} disabled={!value} onClick={() => setValue(null)}>\n\t{value ?? label}\n</Button>`,
	},
	{
		lang: 'tsx',
		code: `<>\n\t<Select options={options} value={value} onChange={(next) => setValue(next)} />\n</>`,
	},
	{
		lang: 'ts',
		code: `export function greet(name: string): string {\n\treturn 'Hello, ' + name\n}`,
	},
]

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
// app and swaps the route in place.
export function RouterLink({ href, ...props }: LinkProps) {
	return <Link to={href} {...props} />
}

type ChromeContext = { locked: boolean; onToggleLocked: () => void }

/**
 * Root of the docs site: a sidebar layout whose body is the route, wired to the
 * persisted theme and density preferences. The router keeps the previous page
 * on screen while the next demo's chunk loads.
 */
export function App() {
	const { pathname } = useLocation()

	const id = parseDemoPath(pathname).id || defaultDemo

	const navigationType = useNavigationType()

	const [locked, setLocked] = useState(true)

	const toggleLocked = useCallback(() => setLocked((l) => !l), [])

	const contentRef = useRef<HTMLDivElement>(null)

	// The page that the layout shows. A page load starts at the top, so the
	// effect below moves the page only after a page change. A tab change keeps
	// the page, and thus its position.
	const shownId = useRef(id)

	useLayoutEffect(() => {
		if (shownId.current === id) return

		shownId.current = id

		// From `lg` up the content pane scrolls, not the window. The browser does
		// not keep the position of the pane, so each page starts at its top.
		contentRef.current?.closest('[class*="overflow-y"]')?.scrollTo(0, 0)

		// On Back and Forward the browser restores the position of the window
		// itself. A new page starts at the top.
		if (navigationType !== 'POP') window.scrollTo(0, 0)
	}, [id, navigationType])

	// Warm Shiki on idle, then tokenize the warm snippets one per idle slice, so
	// the first "Show code" does not pay for the grammar compile. Per-demo
	// prefetch happens via sidebar hover/focus.
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
				// A warm prefetch; a failed chunk fetch (offline, post-deploy 404) is
				// harmless here — CodeBlock re-invokes loadShiki on render and shows its
				// plain fallback — so swallow the rejection rather than leaking it.
				loadShiki()
					.then(({ codeToHtml }) => {
						const snippet = WARM_SNIPPETS[index]

						if (cancelled || snippet === undefined) return

						return codeToHtml(snippet.code, {
							lang: snippet.lang,
							theme: 'github-dark-default',
						}).then(() => {
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
					sidebar={<SidebarContent route={id} />}
				>
					<div ref={contentRef}>
						<Suspense fallback={null}>
							<Outlet context={{ locked, onToggleLocked: toggleLocked } satisfies ChromeContext} />
						</Suspense>
					</div>
				</SidebarLayout>
			</AppearanceProvider>
		</UIProvider>
	)
}

/** The body of one route: the demo page, or a prompt when the id names no demo. */
export function DemoRoute({ id }: { id: string }) {
	const { locked, onToggleLocked } = useOutletContext<ChromeContext>()

	const current = demos.find((d) => d.id === id)

	if (!current) {
		return (
			<div className="p-6">
				<Heading>Select a component</Heading>
			</div>
		)
	}

	return (
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
			<DemoPage demo={current} locked={locked} onToggleLocked={onToggleLocked} />
		</DemoErrorBoundary>
	)
}
