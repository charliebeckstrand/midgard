import { memo, useRef } from 'react'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { IntlMessage, useIntl } from 'ui/primitives/intl'
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
import { appMessages, sectionLabel } from './app-messages.ts'
import { getInitial, LetterRail } from './letter-rail.tsx'
import { SearchButton } from './search.tsx'

/** The pages of each section, in the order of `pages`, which the plugin gives by section and then by name. */
export function groupSections(
	pages: readonly PageLink[],
): { section: string; links: PageLink[] }[] {
	return [...new Set(pages.map((page) => page.category))].map((section) => ({
		section,
		links: pages.filter((page) => page.category === section),
	}))
}

// An item is current on its page. The shell gives `UIProvider` the path of the
// matched page, which is the same on each tab of the page. The item reads the
// path from `UIProvider`, so a navigation renders only the two items whose
// match changes. Only a page of the letter rail has a letter.
const PageItem = memo(function PageItem({ page, lettered }: { page: PageLink; lettered: boolean }) {
	return (
		<SidebarItem href={page.path} data-letter={lettered ? getInitial(page) : undefined}>
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

	const intl = useIntl()

	const sections = groupSections(pages)

	// The letter rail covers the components, the first section. Past them, the
	// rail shows no letter.
	const components = sections[0]?.links ?? []

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>
					<IntlMessage message={appMessages.docs} />
				</Heading>
			</SidebarHeader>
			<SearchButton />
			<Flex align="stretch" gap="sm" className="-me-4 min-h-0 flex-1">
				<SidebarBody ref={bodyRef} className="min-w-0">
					{sections.map(({ section, links }) => {
						const label = sectionLabel(intl, section)

						return (
							<SidebarSection key={section}>
								{/* The muted tone is 4.4:1 on the gray of the sidebar, under the 4.5:1 of small text. */}
								<Text className="density-px-ring-[1.5,2,2.5] mb-2 text-sm text-zinc-600 uppercase tracking-wide dark:text-zinc-400">
									{label}
								</Text>
								<SidebarList aria-label={label}>
									{links.map((page) => (
										<PageItem key={page.path} page={page} lettered={links === components} />
									))}
								</SidebarList>
							</SidebarSection>
						)
					})}
				</SidebarBody>
				<LetterRail pages={components} bodyRef={bodyRef} />
			</Flex>
		</Sidebar>
	)
})
