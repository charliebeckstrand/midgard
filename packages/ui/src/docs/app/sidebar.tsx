import { type CSSProperties, memo, useRef } from 'react'
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
import {
	BODY_TIMELINE,
	getInitial,
	getTargetPages,
	getTimelineName,
	LetterRail,
} from './letter-rail.tsx'
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
// match changes.
//
// The item of a jump of the letter rail is the anchor of the jump, unless it is
// the first in its section. It then holds the view timeline that the rail reads.
const PageItem = memo(function PageItem({
	page,
	timeline,
}: {
	page: PageLink
	timeline?: CSSProperties
}) {
	return (
		<SidebarItem href={page.path} data-letter={getInitial(page)} style={timeline}>
			<SidebarLabel>{page.name}</SidebarLabel>
		</SidebarItem>
	)
})

/**
 * The sidebar of the docs: the button of the search, the pages of each
 * section, and the letter rail. The shell renders again on each change of the
 * router state, and the props change only when the page changes, so the
 * sidebar memoizes.
 */
export const DocsSidebar = memo(function DocsSidebar({
	pages,
	current,
}: {
	pages: readonly PageLink[]
	/** The path of the current page, whose letter the rail pins until the body scrolls. */
	current?: string
}) {
	const bodyRef = useRef<HTMLDivElement>(null)

	const intl = useIntl()

	const sections = groupSections(pages)

	const targets = getTargetPages(pages)

	const currentPage = pages.find((page) => page.path === current)

	const currentLetter = currentPage && getInitial(currentPage)

	// The view timeline of the anchor of the jump to `page`, or none when no jump goes to it.
	const getTimelineStyle = (page: PageLink): CSSProperties | undefined =>
		targets.includes(page)
			? { viewTimeline: `${getTimelineName(getInitial(page))} block` }
			: undefined

	// The rail and the body are siblings, so their box lifts the names of the
	// timelines to where the rail can read them.
	const scope = {
		timelineScope: [
			...targets.map((page) => getTimelineName(getInitial(page))),
			BODY_TIMELINE,
		].join(', '),
	} as CSSProperties

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>
					<IntlMessage message={appMessages.docs} />
				</Heading>
			</SidebarHeader>
			<SearchButton />
			<Flex align="stretch" gap="sm" className="-me-4 min-h-0 flex-1" style={scope}>
				<SidebarBody
					ref={bodyRef}
					className="min-w-0"
					style={{ scrollTimeline: `${BODY_TIMELINE} block` } as CSSProperties}
				>
					{sections.map(({ section, links }) => {
						const label = sectionLabel(intl, section)

						// A jump to the first page of a section brings the heading of the
						// section too, so the section is the anchor of that jump.
						const [first] = links

						return (
							<SidebarSection key={section} style={first && getTimelineStyle(first)}>
								{/* The muted tone is 4.4:1 on the gray of the sidebar, under the 4.5:1 of small text. */}
								<Text className="density-px-ring-[1.5,2,2.5] mb-2 text-sm text-zinc-600 uppercase tracking-wide dark:text-zinc-400">
									{label}
								</Text>
								<SidebarList aria-label={label}>
									{links.map((page) => (
										<PageItem
											key={page.path}
											page={page}
											timeline={page === first ? undefined : getTimelineStyle(page)}
										/>
									))}
								</SidebarList>
							</SidebarSection>
						)
					})}
				</SidebarBody>
				<LetterRail pages={pages} bodyRef={bodyRef} current={currentLetter} />
			</Flex>
		</Sidebar>
	)
})
