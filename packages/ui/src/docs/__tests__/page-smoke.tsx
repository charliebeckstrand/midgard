import { join } from 'node:path'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { configureAxe } from 'jest-axe'
import { type ComponentType, useEffect } from 'react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { Heading } from 'ui/heading'
import { SidebarLayoutBody } from 'ui/layouts'
import type { LinkProps } from 'ui/primitives/link'
import { AppearanceProvider } from 'ui/providers/appearance'
import { LocaleProvider } from 'ui/providers/locale'
import { UIProvider } from 'ui/providers/ui'
import { Sidebar } from 'ui/sidebar'
import { describe, expect, it, vi } from 'vitest'
import { CI } from '../../../vitest.base.ts'
import { catalogs } from '../app/catalogs.ts'
import { LOCALES } from '../app/language.ts'
import { findPages, type Page } from '../plugin/pages.ts'
import { loadCopy } from './copy.tsx'
import { restoreRootAfterCase } from './restore-root.ts'
import { findSameText, readTexts, recordIntl } from './same-text.ts'

// The smoke test of each page of the docs. Several test files run it, and each
// file gives it one part of the pages (`smokeParts`). A file runs on one
// worker, so a part that holds most of the pages sets the wall clock of the
// whole `docs` project. Small parts spread the pages over the workers and over
// the test shards of CI.
//
// The test renders each page module at its path, as the routes of the docs app
// give it, and it opens each tab. That is each tab of the page, which is a
// route of its own, and each tab that an example shows. A page fails when it
// throws, or when it writes to `console.error` or `console.warn`. It also fails
// when a curated set of axe rules finds a violation in a state that it shows.
// It fails too when two elements of a state have the same id, or when a state
// shows no example, so each page and each tab shows its unit in an example or
// a playground.
// `page-coverage.test.ts` asks whether a page exists, and this test asks
// whether the page works.
//
// The test renders each page in each language that the docs translate, with
// the catalogs of the docs. It renders the copy of each page module and each
// tab module in the language, with each demo text in the language
// (`plugin/copies.ts`). A name from the code that shows as text, such as the
// title of an example or the label of a field of a playground, writes an error
// when the catalog has no message for it (`kit/names.ts`). So a page fails
// when `pnpm intl` misses a name that the page shows.
//
// The test then renders each page in English and opens each tab. A text that
// a translated page shows as the English page does fails the test, unless it
// comes from a recorded source, such as a name or the output of a formatter
// (`same-text.ts`). So a page fails when a translation misses a text of a
// demo, of its data, or of ui.
//
// The rules (`AXE_RULES`) are the structural ones that a page breaks most.
// They find a button with no name, and a role that lacks its required
// children. They also find two landmarks with the same name, a form control
// with no label, a heading that skips a level, and a second main landmark or
// one inside another. The test renders the `h1` of the page, as the header of
// the shell does, so the headings of the page start under it. It renders the
// page in the main landmark of a layout, next to a navigation landmark, as the
// shell does, so the rules see the landmarks of the shell with those of the
// page. jsdom has no layout, so the rules of geometry stay with the browser
// suite.
//
// The pages import the virtual modules of the docs plugin, so the `docs`
// project loads the plugin (`vitest.docs.config.ts`).

/** The English module of each page and each tab, keyed by module path. */
const englishModules = import.meta.glob<ComponentType>(
	['../pages/*/*/index.tsx', '../pages/*/*/*/index.tsx'],
	{ import: 'default' },
)

/** Each page module and each tab module, as its module path, in name order. */
export const pageModules: readonly string[] = Object.keys(englishModules).toSorted()

/** The locale of each language that the docs translate: each locale but English. */
const TRANSLATED = LOCALES.slice(1)

/**
 * The copy of each page module and each tab module in `locale`, keyed by
 * module path ({@link loadCopy}).
 */
function translatedModules(locale: string): Modules {
	return Object.fromEntries(
		pageModules.map((path) => [path, async () => (await loadCopy(path, locale)).default]),
	)
}

/**
 * The module path of the page or the tab in `folder`. The folder is relative
 * to `pages/`, such as `modules/grid/sorting`.
 */
export function toPath(folder: string): string {
	return `../pages/${folder}/index.tsx`
}

/** Each page of the docs, in the order of the sidebar. */
export const docsPages: readonly Page[] = findPages(join(import.meta.dirname, '..'))

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
 * The parts take about the same time on one worker. The pages outside
 * `modules/` go into {@link OTHER_PARTS} parts in turn. The grid page alone
 * takes as long as a part, so it has a part of its own.
 */
export const smokeParts: Readonly<Record<string, readonly Page[]>> = {
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
const AXE_RULES = [
	'button-name',
	'aria-required-children',
	'landmark-unique',
	'label',
	'heading-order',
	'landmark-no-duplicate-main',
	'landmark-main-is-top-level',
]

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

	const siblings = [...(list?.querySelectorAll('[role="tab"]') ?? [])].map(
		(sibling) => sibling.textContent,
	)

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
		vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
			logged.push(`console.${level}: ${args.map(String).join(' ')}`)
		})
	}

	return logged
}

/**
 * Each id that more than one element of the document has. An example heading
 * and an entry of the API reference take their ids from names, so two of them
 * can collide, and a link to the page then goes to the first.
 */
function duplicateIds(): string[] {
	const seen = new Set<string>()

	const twice = new Set<string>()

	for (const { id } of document.body.querySelectorAll('[id]')) {
		if (seen.has(id)) twice.add(id)

		seen.add(id)
	}

	return [...twice]
}

/** What one walk of a page found. */
type Walk = {
	/** What `console.error` and `console.warn` wrote. */
	logged: readonly string[]
	/** Each node that breaks an axe rule, as `rule: selector`. */
	violations: readonly string[]
	/** Each id that two elements had in a state. */
	duplicates: readonly string[]
	/** The number of states that showed no example or playground. */
	bare: number
	/** Each path that the router showed. */
	visited: ReadonlySet<string>
	/** Each text that a translated page shows as the English page does (`same-text.ts`), as `locale: text`. */
	same: readonly string[]
}

/** The locale of the render that each translated text is compared with. */
const ENGLISH = 'en-US'

/** The modules of a language, keyed by module path. */
type Modules = Readonly<Record<string, () => Promise<ComponentType>>>

/** Loads the module of the page or the tab in `folder`, from `from`. */
async function load(from: Modules, folder: string): Promise<ComponentType> {
	const loader = from[toPath(folder)]

	if (!loader) throw new Error(`docs: no module at ${toPath(folder)}`)

	return loader()
}

/** The module of a page and the module of each of its tabs, by tab. */
type Loaded = readonly [ComponentType, readonly (readonly [string, ComponentType])[]]

/** Loads the module of a page and of each of its tabs, from `from`. */
function loadPage(page: Page, from: Modules): Promise<Loaded> {
	return Promise.all([
		load(from, page.folder),
		Promise.all(
			page.tabs.map(async (tab) => [tab, await load(from, `${page.folder}/${tab}`)] as const),
		),
	])
}

/**
 * Renders a page at its path in `locale`, with a child route for each tab, as
 * the routes of the docs app give it. The providers are the providers of the
 * shell of the docs app, and the `h1` of the page is the heading of the header
 * of the shell. The heading shows the name of a component, which is code.
 *
 * The render is synchronous, so the first visit of the page goes into `act`
 * before an update of the page that waits for a microtask.
 */
function renderPage(
	page: Page,
	locale: string,
	[Page, tabs]: Loaded,
	visited: Set<string>,
): Element {
	return render(
		<MemoryRouter initialEntries={[page.path]}>
			<LocaleProvider locale={locale} catalogs={catalogs}>
				<UIProvider link={RouterLink}>
					<AppearanceProvider>
						<VisitedPaths visited={visited} />
						<Heading translate="no">{page.name}</Heading>
						<Sidebar />
						<SidebarLayoutBody>
							<Routes>
								<Route path={page.path} element={<Page />}>
									{tabs.map(([tab, Tab]) => (
										<Route key={tab} path={tab} element={<Tab />} />
									))}
								</Route>
							</Routes>
						</SidebarLayoutBody>
					</AppearanceProvider>
				</UIProvider>
			</LocaleProvider>
		</MemoryRouter>,
	).container
}

/** What the walk of a page in one translated locale found. */
type TranslatedWalk = Pick<Walk, 'violations' | 'duplicates' | 'bare'> & {
	/** Each text of the page in the locale. */
	texts: ReadonlySet<string>
	/** The output of the formatters in the render. */
	formatted: ReadonlySet<string>
}

/**
 * Renders a page in the translated `locale` and opens each tab. In each state,
 * it reads the ids, finds the examples, runs axe, and reads the text.
 */
async function walkTranslated(
	page: Page,
	locale: string,
	visited: Set<string>,
): Promise<TranslatedWalk> {
	const loaded = await loadPage(page, translatedModules(locale))

	const texts = new Set<string>()

	const formatted = new Set<string>()

	const violations = new Set<string>()

	const duplicates = new Set<string>()

	let bare = 0

	const stopRecording = recordIntl(formatted)

	try {
		const container = renderPage(page, locale, loaded, visited)

		await visitTabs(container, async () => {
			for (const id of duplicateIds()) duplicates.add(id)

			// The frame of an example and of a playground (`kit/example.tsx`).
			if (!document.body.querySelector('[data-slot="example"]')) bare++

			// A page is live. Its timers and effects update it while axe runs, so the
			// run goes inside `act`.
			const results = await act(() => axe(document.body))

			for (const { id, nodes } of results.violations) {
				for (const node of nodes) violations.add(`${locale}: ${id}: ${node.target.join(' ')}`)
			}

			readTexts(document.body, locale, texts)
		})
	} finally {
		stopRecording()
	}

	cleanup()

	return { texts, formatted, violations: [...violations], duplicates: [...duplicates], bare }
}

/**
 * Renders a page in each translated locale and opens each tab
 * ({@link walkTranslated}). It then renders the page in English, opens each
 * tab, and reads the text, so it finds the text that is the same in a
 * translation and in English.
 */
async function walk(page: Page): Promise<Walk> {
	restoreRootAfterCase()

	const logged = captureConsole()

	const visited = new Set<string>()

	const translated: (readonly [string, TranslatedWalk])[] = []

	for (const locale of TRANSLATED) {
		translated.push([locale, await walkTranslated(page, locale, visited)])
	}

	const english = new Set<string>()

	// As in the translated walk, the read goes inside `act`, so the updates of
	// the live page land in it.
	await visitTabs(
		renderPage(page, ENGLISH, await loadPage(page, englishModules), new Set()),
		async () => {
			await act(async () => readTexts(document.body, 'en', english))
		},
	)

	// The English read is quick, so a timer of the page can still be due. The
	// unmount comes first, so the timer updates no page outside of `act`.
	cleanup()

	const walks = translated.map(([, each]) => each)

	return {
		logged: [...logged],
		violations: walks.flatMap(({ violations }) => violations),
		duplicates: [...new Set(walks.flatMap(({ duplicates }) => duplicates))],
		bare: walks.reduce((sum, { bare }) => sum + bare, 0),
		visited,
		same: translated.flatMap(([locale, { texts, formatted }]) =>
			findSameText(locale, texts, english, formatted).map((text) => `${locale}: ${text}`),
		),
	}
}

/** Registers a smoke case for each page of `part`. */
export function describePageSmoke(part: readonly Page[]): void {
	describe('page smoke', () => {
		it.each(part.map((page) => [page.path, page] as const))(
			'%s renders each tab with no console output and no rule violation',
			// The grid page is the slowest. It has 20 tabs, its examples show more
			// tabs, and axe runs in each state, so the case is the longest of the
			// suite. The limit scales on CI by the factor of the suite `testTimeout`.
			{ timeout: CI ? 180_000 : 60_000 },
			async (_path, page) => {
				const { logged, violations, duplicates, bare, visited, same } = await walk(page)

				expect(logged).toEqual([])

				expect(violations).toEqual([])

				expect(duplicates, 'two elements of a state have these ids').toEqual([])

				expect(bare, 'states that show no example or playground').toBe(0)

				const closed = page.tabs
					.map((tab) => `${page.path}/${tab}`)
					.filter((path) => !visited.has(path))

				expect(closed, 'the walk did not open these tabs of the page').toEqual([])

				expect(same, 'text that a translated page shows in English').toEqual([])
			},
		)
	})
}
