import { type ReactNode, useState } from 'react'
import {
	PrefetchPageLinks,
	useLocation,
	useNavigate,
	useOutlet,
	useResolvedPath,
} from 'react-router'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'

/** The path part of a tab: `Server grouping` gives `server-grouping`. */
function slugOf(tab: string): string {
	return tab.toLowerCase().replaceAll(' ', '-')
}

/**
 * The tabs of a page. The first tab is at the path of the page and shows
 * `children`. Each other tab is a route one part down the path, from the
 * folder of its slug, such as `sorting/index.tsx` for `/grid/sorting`. So a
 * reload, a link, and the back button keep the tab, and the build renders each
 * tab to its own HTML file. The code of a tab loads when the reader points at
 * the tab or focuses it.
 */
export function PageTabs({ tabs, children }: { tabs: readonly string[]; children: ReactNode }) {
	const outlet = useOutlet()

	const navigate = useNavigate()

	const page = useResolvedPath('.').pathname

	const { pathname } = useLocation()

	const [first = ''] = tabs

	const current = pathname.slice(page.length + 1) || slugOf(first)

	const [intent, setIntent] = useState<string>()

	return (
		<Tabs
			value={current}
			onValueChange={(tab) => {
				if (tab === null) return

				// The page keeps its scroll position when the tab changes.
				navigate(tab === slugOf(first) ? '.' : tab, { preventScrollReset: true })
			}}
		>
			<TabList aria-label="Sections">
				{tabs.map((tab) => (
					<Tab key={tab} value={slugOf(tab)} onPreload={setIntent}>
						{tab}
					</Tab>
				))}
			</TabList>
			{intent && intent !== slugOf(first) && <PrefetchPageLinks page={`${page}/${intent}`} />}
			<TabContents fade={false}>
				<TabContent value={current}>
					<Stack gap="xl">{outlet ?? children}</Stack>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
