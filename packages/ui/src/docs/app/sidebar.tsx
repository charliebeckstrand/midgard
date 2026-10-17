import { memo, useRef } from 'react'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
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
import { initialOf, LetterRail } from './letter-rail.tsx'
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
		<SidebarItem href={page.path} data-letter={initialOf(page)}>
			<SidebarLabel>{page.name}</SidebarLabel>
		</SidebarItem>
	)
})

/**
 * The sidebar of the docs: the button of the search, the pages of each
 * section, and the letter rail. The shell renders again on each change of the
 * router state, and the props do not change, so the sidebar memoizes.
 */
export const DocsSidebar = memo(function DocsSidebar({ pages }: { pages: readonly PageLink[] }) {
	const bodyRef = useRef<HTMLDivElement>(null)

	const sections = sectionsOf(pages)

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>Docs</Heading>
			</SidebarHeader>
			<SearchButton />
			<Flex align="stretch" gap="sm" className="-me-4 min-h-0 flex-1">
				<SidebarBody ref={bodyRef} className="min-w-0">
					{sections.map(({ section, links }) => (
						<SidebarSection key={section}>
							{/* The muted tone is 4.4:1 on the gray of the sidebar, under the 4.5:1 of small text. */}
							<Text className="density-px-ring-[1.5,2,2.5] mb-2 text-sm text-zinc-600 uppercase tracking-wide dark:text-zinc-400">
								{section}
							</Text>
							<SidebarList aria-label={section}>
								{links.map((page) => (
									<PageItem key={page.path} page={page} />
								))}
							</SidebarList>
						</SidebarSection>
					))}
				</SidebarBody>
				<LetterRail pages={pages} bodyRef={bodyRef} />
			</Flex>
		</Sidebar>
	)
})
