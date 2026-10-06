import pages from 'virtual:docs/pages'
import { act, fireEvent, render } from '@testing-library/react'
import { configureAxe } from 'jest-axe'
import { type ComponentType, useEffect } from 'react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { LinkProps } from 'ui/primitives/link'
import { AppearanceProvider } from 'ui/providers/appearance'
import { UIProvider } from 'ui/providers/ui'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { maxDepth } from '../../core/density/rungs.ts'
import { readRootDensity, writeRootDensity } from '../../core/density/steps.ts'

// The smoke test of each page of the docs. Several test files run it, and each
// file gives it one part of the pages (`smokeParts`). A file runs on one
// worker, so a part that holds most of the pages sets the wall clock of the
// whole `unit` project. Small parts spread the pages over the workers and over
// the test shards of CI.
//
// The test renders each page module at its path, as the routes of the docs app
// give it, and it opens each tab. That is each tab of the page, which is a
// route of its own, and each tab that an example shows. A page fails when it
// throws, or when it writes to `console.error` or `console.warn`. It also fails
// when a curated set of axe rules finds a violation in a state that it shows.
// It fails too when a state nests more density scopes than the rungs rank
// (`maxDepth`). `page-coverage.test.ts` asks whether a page exists, and this
// test asks whether the page works.
//
// The rules (`AXE_RULES`) are the structural ones that a page breaks most.
// They find a button with no name, and a role that lacks its required
// children. They also find two landmarks with the same name, and a form
// control with no label. jsdom has no layout, so the rules of geometry stay
// with the browser suite.
//
// The pages import the virtual modules of the docs plugin, so the `unit`
// project loads the plugin (`vitest.config.ts`).

/** The page modules and the tab modules, keyed by module path. */
const modules = import.meta.glob<ComponentType>(
	['../pages/*/*/index.tsx', '../pages/*/*/*/index.tsx'],
	{ import: 'default' },
)

/** Each page module and each tab module, as its module path, in name order. */
export const pageModules: readonly string[] = Object.keys(modules).toSorted()

/**
 * The module path of the page or the tab in `folder`. The folder is relative
 * to `pages/`, such as `modules/grid/sorting`.
 */
export function moduleOf(folder: string): string {
	return `../pages/${folder}/index.tsx`
}

/** A page of the docs: its path, its folder in `pages/`, and the folder of each tab. */
export type DocsPage = { path: string; folder: string; tabs: readonly string[] }

/**
 * Each page of the docs, in the order of the sidebar. The last part of the
 * path of a page is the name of its folder. A component page has no section in
 * its path, so the section comes from its category.
 */
export const docsPages: readonly DocsPage[] = pages.map(({ path, category, tabs }) => ({
	path,
	folder: `${category}/${path.split('/').at(-1)}`,
	tabs,
}))

/** The pages of `modules/`. */
const modulePages = docsPages.filter(({ folder }) => folder.startsWith('modules/'))

/** The pages that are not in `modules/`. */
const otherPages = docsPages.filter(({ folder }) => !folder.startsWith('modules/'))

/** The grid page, the slowest page by far. */
const GRID = '/modules/grid'

/** The number of parts that the pages outside `modules/` go into. */
const OTHER_PARTS = 4

/**
 * The part of the pages that each smoke file runs, by the name of the file.
 * Each part takes about 10s on one worker of a 4-core machine. The pages
 * outside `modules/` go into {@link OTHER_PARTS} parts in turn. The grid page
 * takes about 12s alone, so it has a part of its own.
 */
export const smokeParts: Readonly<Record<string, readonly DocsPage[]>> = {
	...Object.fromEntries(
		Array.from({ length: OTHER_PARTS }, (_, part) => [
			part === 0 ? 'page-smoke' : `page-smoke-${part + 1}`,
			otherPages.filter((_, index) => index % OTHER_PARTS === part),
		]),
	),
	'page-smoke-modules': modulePages.filter(({ path }) => path !== GRID),
	'page-smoke-grid': modulePages.filter(({ path }) => path === GRID),
}

/** The rules that the smoke test asks axe to run. The head of this file tells why. */
const AXE_RULES = ['button-name', 'aria-required-children', 'landmark-unique', 'label']

// No rule of `AXE_RULES` reads the stylesheets or the media of the page, so
// axe does not load them before it runs. That makes each run about three
// times faster.
const axe = configureAxe({
	resultTypes: ['violations'],
	runOnly: { type: 'rule', values: AXE_RULES },
	preload: false,
})

/** The link of ui, as the docs app gives it: a link of the router. */
function RouterLink({ href, ...props }: LinkProps) {
	return <Link to={href} {...props} />
}

/** Adds each path that the router shows to `visited`. */
function VisitedPaths({ visited }: { visited: Set<string> }) {
	const { pathname } = useLocation()

	useEffect(() => {
		visited.add(pathname)
	}, [visited, pathname])

	return null
}

/** The label of a tab, qualified by its tablist, so two lists with a tab `A` stay apart. */
function tabKey(tab: Element): string {
	const list = tab.closest('[role="tablist"]')

	const siblings = [...(list?.querySelectorAll('[role="tab"]') ?? [])].map((t) => t.textContent)

	return `${siblings.join('|')}::${tab.textContent}`
}

/** Whether a reader can open a tab. */
function isOpenable(tab: Element): boolean {
	return !tab.hasAttribute('disabled') && tab.getAttribute('aria-disabled') !== 'true'
}

/**
 * Calls `visit` on the first render of a page, and again after it opens each
 * tab. It opens each tab that it finds, also a tab that a panel shows, until
 * no tab stays closed. A disabled tab stays closed.
 */
async function visitTabs(container: Element, visit: () => Promise<void>): Promise<void> {
	await visit()

	const seen = new Set<string>()

	for (;;) {
		const next = [...container.querySelectorAll('[role="tab"]')].find(
			(tab) => !seen.has(tabKey(tab)) && isOpenable(tab),
		)

		if (!next) break

		seen.add(tabKey(next))

		await act(async () => {
			fireEvent.click(next)
		})

		await visit()
	}
}

/** Collects what `console.error` and `console.warn` write during the case, and keeps it off the output. */
function captureConsole(): string[] {
	const logged: string[] = []

	for (const level of ['error', 'warn'] as const) {
		const spy = vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
			logged.push(`console.${level}: ${args.map(String).join(' ')}`)
		})

		onTestFinished(() => spy.mockRestore())
	}

	return logged
}

/**
 * Puts back the theme class and the density step that `AppearanceProvider`
 * writes to the root element and does not remove on unmount. The window is
 * shared across the files of a worker, so a step left on the root would reach
 * a later file that reads it.
 */
function restoreRootAfterCase(): void {
	const root = document.documentElement

	const density = readRootDensity(root)

	const dark = root.classList.contains('dark')

	onTestFinished(() => {
		writeRootDensity(root, density)

		root.classList.toggle('dark', dark)
	})
}

/** The name of a scope in a chain: its tag, its step, and its `data-slot`. */
function scopeName(element: Element): string {
	const slot = element.getAttribute('data-slot')

	return `${element.localName}[${element.getAttribute('data-density')}]${slot ? `{${slot}}` : ''}`
}

/**
 * The longest chain of density scopes in the document, outermost first. The
 * root element is the scope of the app, and it does not count as a depth.
 */
function deepestScopeChain(): Element[] {
	let deepest: Element[] = []

	for (const element of document.body.querySelectorAll('[data-density]')) {
		const chain: Element[] = []

		for (
			let node: Element | null = element;
			node && node !== document.documentElement;
			node = node.parentElement
		) {
			if (node.hasAttribute('data-density')) chain.unshift(node)
		}

		if (chain.length > deepest.length) deepest = chain
	}

	return deepest
}

/** What one walk of a page found. */
type Walk = {
	/** What `console.error` and `console.warn` wrote. */
	logged: readonly string[]
	/** Each node that breaks an axe rule, as `rule: selector`. */
	violations: readonly string[]
	/** The longest chain of density scopes in a state, outermost first, as names. */
	scopes: readonly string[]
	/** Each path that the router showed. */
	visited: ReadonlySet<string>
}

/** Loads the default export of the page or the tab in `folder`. */
function load(folder: string): Promise<ComponentType> {
	const loader = modules[moduleOf(folder)]

	if (!loader) throw new Error(`docs: no module at ${moduleOf(folder)}`)

	return loader()
}

/**
 * Renders a page at its path, with a child route for each tab, as the routes
 * of the docs app give it. The providers are the providers of the shell of the
 * docs app. It then opens each tab. In each state, it reads the depth of the
 * density scopes and runs axe.
 */
async function walk(page: DocsPage): Promise<Walk> {
	restoreRootAfterCase()

	const logged = captureConsole()

	const [Page, tabs] = await Promise.all([
		load(page.folder),
		Promise.all(page.tabs.map(async (tab) => [tab, await load(`${page.folder}/${tab}`)] as const)),
	])

	const visited = new Set<string>()

	const { container } = render(
		<MemoryRouter initialEntries={[page.path]}>
			<UIProvider link={RouterLink}>
				<AppearanceProvider>
					<VisitedPaths visited={visited} />
					<Routes>
						<Route path={page.path} element={<Page />}>
							{tabs.map(([tab, Tab]) => (
								<Route key={tab} path={tab} element={<Tab />} />
							))}
						</Route>
					</Routes>
				</AppearanceProvider>
			</UIProvider>
		</MemoryRouter>,
	)

	const violations = new Set<string>()

	let deepest: Element[] = []

	await visitTabs(container, async () => {
		const chain = deepestScopeChain()

		if (chain.length > deepest.length) deepest = chain

		// A page is live. Its timers and effects update it while axe runs, so the
		// run goes inside `act`.
		const results = await act(() => axe(document.body))

		for (const { id, nodes } of results.violations) {
			for (const node of nodes) violations.add(`${id}: ${node.target.join(' ')}`)
		}
	})

	return {
		logged: [...logged],
		violations: [...violations],
		scopes: deepest.map(scopeName),
		visited,
	}
}

/** Registers a smoke case for each page of `part`. */
export function describePageSmoke(part: readonly DocsPage[]): void {
	describe('page smoke', () => {
		it.each(part.map((page) => [page.path, page] as const))(
			'%s renders each tab with no console output and no rule violation',
			// The grid page is the slowest. It has 20 tabs, its examples show more
			// tabs, and axe runs in each state. The case takes about 15s on four
			// cores.
			{ timeout: 60_000 },
			async (_path, page) => {
				const { logged, violations, scopes, visited } = await walk(page)

				expect(logged).toEqual([])

				expect(violations).toEqual([])

				expect(scopes.length, `${page.path} nests ${scopes.join(' > ')}`).toBeLessThanOrEqual(
					maxDepth,
				)

				const closed = page.tabs
					.map((tab) => `${page.path}/${tab}`)
					.filter((path) => !visited.has(path))

				expect(closed, 'the walk did not open these tabs of the page').toEqual([])
			},
		)
	})
}
