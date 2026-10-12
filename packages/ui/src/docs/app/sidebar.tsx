import { ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { memo, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	SidebarSection,
} from 'ui/sidebar'
import { Text } from 'ui/text'
import type { PageLink } from '../plugin/pages.ts'
import { SearchButton } from './search.tsx'

/** The pages of each section, in the order of `pages`, which the plugin gives by section and then by name. */
export function sectionsOf(pages: readonly PageLink[]): { section: string; links: PageLink[] }[] {
	return [...new Set(pages.map((page) => page.category))].map((section) => ({
		section,
		links: pages.filter((page) => page.category === section),
	}))
}

// An item is current on its page. The shell gives `UIProvider` the path of the
// matched page, which is the same on each tab of the page. The item reads the
// path from `UIProvider`, so a navigation renders only the two items whose
// match changes.
const PageItem = memo(function PageItem({ page }: { page: PageLink }) {
	return (
		<SidebarItem href={page.path}>
			<SidebarLabel>{page.name}</SidebarLabel>
		</SidebarItem>
	)
})

/**
 * The sidebar of the docs: the button of the search, the sort order, and the
 * pages of each section. The shell renders again on each change of the router
 * state, and the props do not change, so the sidebar memoizes.
 */
export const DocsSidebar = memo(function DocsSidebar({ pages }: { pages: readonly PageLink[] }) {
	const [descending, setDescending] = useState(false)

	const sections = sectionsOf(pages)

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>Docs</Heading>
			</SidebarHeader>
			<Flex gap="sm">
				<SearchButton />
				<Button
					variant="bare"
					aria-label={descending ? 'Sort A to Z' : 'Sort Z to A'}
					onClick={() => setDescending(!descending)}
				>
					<Icon icon={descending ? <ArrowUpZA /> : <ArrowDownAZ />} />
				</Button>
			</Flex>
			{/* A reversed list moves each item, and scroll anchoring then follows an
			    item to its new place. The list keeps its scroll position instead. */}
			<SidebarBody className="[overflow-anchor:none]">
				{sections.map(({ section, links }) => (
					<SidebarSection key={section}>
						{/* The muted tone is 4.4:1 on the gray of the sidebar, under the 4.5:1 of small text. */}
						<Text className="density-px-ring-[1.5,2,2.5] mb-2 text-sm text-zinc-600 uppercase tracking-wide dark:text-zinc-400">
							{section}
						</Text>
						<SidebarList aria-label={section}>
							{(descending ? links.toReversed() : links).map((page) => (
								<PageItem key={page.path} page={page} />
							))}
						</SidebarList>
					</SidebarSection>
				))}
			</SidebarBody>
		</Sidebar>
	)
})
