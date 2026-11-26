import { ChevronDown } from 'lucide-react'
import { memo, useMemo, useRef } from 'react'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { dataAttr } from 'ui/core'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { IntlMessage, useIntl } from 'ui/primitives/intl'
import { TouchTarget } from 'ui/primitives/touch-target'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	SidebarSection,
} from 'ui/sidebar'
import type { PageLink } from '../plugin/pages.ts'
import { appMessages, sectionLabel } from './app-messages.ts'
import { getInitial, LetterRail } from './letter-rail.tsx'
import { SearchButton } from './search.tsx'
import { sectionRules } from './section-marks.ts'
import { useCurrentPage } from './use-current-page.ts'
import { useSectionsOpen } from './use-sections-open.ts'

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
 * section, and the letter rail. The title of a section opens and closes the
 * section ({@link useSectionsOpen}). The shell renders again on each change of
 * the router state, and the props do not change, so the sidebar memoizes. It
 * renders again on a navigation, because the current page opens its section.
 */
export const DocsSidebar = memo(function DocsSidebar({ pages }: { pages: readonly PageLink[] }) {
	const bodyRef = useRef<HTMLDivElement>(null)

	const intl = useIntl()

	const sections = useMemo(() => groupSections(pages), [pages])

	const folders = useMemo(() => sections.map(({ section }) => section), [sections])

	const { current, isOpen, isLive, setOpen } = useSectionsOpen(folders, useCurrentPage(pages))

	// The letter rail covers the components, the first section. Past them, the
	// rail shows no letter.
	const components = sections[0]

	return (
		<Sidebar aria-label={intl.formatMessage(appMessages.pages)}>
			{/* Hides each section that the root marks as closed, until the stored state applies. */}
			<style>{sectionRules(folders)}</style>
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

						// The closed list stays in the DOM: the letter rail reads its links, and
						// an open does not mount each item again.
						return (
							<SidebarSection
								key={section}
								data-docs-section={section}
								data-docs-live={dataAttr(isLive(section))}
								data-docs-current={dataAttr(section === current)}
							>
								<Collapse
									mount="always"
									open={isOpen(section)}
									onOpenChange={(open) => setOpen(section, open)}
								>
									{/* The muted tone is 4.4:1 on the gray of the sidebar, under the 4.5:1 of small text. */}
									<CollapseTrigger className="density-px-ring-[1.5,2,2.5] relative mb-1 flex w-full py-1 justify-between rounded-lg text-sm text-zinc-600 uppercase tracking-wide hover:text-zinc-950 focus-visible:-outline-offset-2 aria-expanded:text-zinc-600 dark:text-zinc-400 dark:aria-expanded:text-zinc-400 dark:hover:text-white">
										<TouchTarget>
											{label}
											<Icon
												icon={ChevronDown}
												// Closed, the chevron points to the end of the line.
												className="size-4 shrink-0 -rotate-90 transition-transform in-aria-expanded:rotate-0 motion-reduce:transition-none rtl:rotate-90 rtl:in-aria-expanded:rotate-0"
											/>
										</TouchTarget>
									</CollapseTrigger>
									<CollapsePanel>
										<SidebarList aria-label={label}>
											{links.map((page) => (
												<PageItem
													key={page.path}
													page={page}
													lettered={section === components?.section}
												/>
											))}
										</SidebarList>
									</CollapsePanel>
								</Collapse>
							</SidebarSection>
						)
					})}
				</SidebarBody>
				{components && isOpen(components.section) && (
					<div data-docs-rail={components.section} className="contents">
						<LetterRail pages={components.links} bodyRef={bodyRef} />
					</div>
				)}
			</Flex>
		</Sidebar>
	)
})
