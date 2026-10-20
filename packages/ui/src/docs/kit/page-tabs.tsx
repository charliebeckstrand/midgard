import pages from 'virtual:docs/pages'
import { type ReactNode, useState } from 'react'
import {
	PrefetchPageLinks,
	useLocation,
	useNavigate,
	useOutlet,
	useResolvedPath,
} from 'react-router'
import { defineMessage, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { tabName, toSlug } from './tab-name.ts'

const sectionsMessage = defineMessage({
	id: 'docs.tabs.sections',
	defaultMessage: 'Sections',
	description:
		'The name of the list of tabs at the top of a page of the docs. Each tab shows one part of the page.',
})

/**
 * A path with no slash at the end. The prerender asks for each page with a
 * slash at the end, and a host can add one, so `/grid/sorting/` is the same
 * page as `/grid/sorting`.
 */
function trimSlash(path: string): string {
	return path.replace(/\/$/, '')
}

/**
 * The tabs of a page, in the language of the reader. A page gives `tabs` from
 * its `TABS` constant, which `pnpm intl` reads for the names of the catalog.
 * The first tab is at the path of the page and shows
 * `children`. Each other tab is a route one part down the path, from the
 * folder of its slug, such as `sorting/index.tsx` for `/grid/sorting`. So a
 * reload, a link, and the back button keep the tab, and the build renders each
 * tab to its own HTML file. The code of a tab loads when the reader points at
 * the tab or focuses it.
 */
export function PageTabs({ tabs, children }: { tabs: readonly string[]; children: ReactNode }) {
	const outlet = useOutlet()

	const navigate = useNavigate()

	const page = trimSlash(useResolvedPath('.').pathname)

	const { pathname } = useLocation()

	const [first = '', ...others] = tabs

	// Each tab but the first is a folder. The prerender renders each page, so a
	// tab with no folder, or a folder with no tab, fails the build.
	const slugs = others.map(toSlug).toSorted()

	const folders = pages.find((link) => link.path === page)?.tabs ?? []

	if (slugs.join() !== folders.join()) {
		throw new Error(
			`docs: the tabs of ${page} (${slugs.join()}) are not its folders (${folders.join()})`,
		)
	}

	const current = trimSlash(pathname).slice(page.length + 1) || toSlug(first)

	const [intent, setIntent] = useState<string>()

	const intl = useIntl()

	return (
		<Tabs
			value={current}
			onValueChange={(tab) => {
				if (tab === null) return

				// The page keeps its scroll position when the tab changes.
				navigate(tab === toSlug(first) ? '.' : tab, { preventScrollReset: true })
			}}
		>
			<TabList aria-label={intl.formatMessage(sectionsMessage)}>
				{tabs.map((tab) => (
					<Tab key={tab} value={toSlug(tab)} onPreload={setIntent}>
						{tabName(intl, toSlug(tab), tab)}
					</Tab>
				))}
			</TabList>
			{intent && intent !== toSlug(first) && <PrefetchPageLinks page={`${page}/${intent}`} />}
			<TabContents animate={false}>
				<TabContent value={current}>
					<Stack gap="xl">{outlet ?? children}</Stack>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
