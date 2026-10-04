import { ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { memo, use, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from 'ui/button'
import { Combobox, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { useScrollWithin } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { OffcanvasContext } from 'ui/primitives/offcanvas'
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

/** The pages of each section, in the order of `pages`. The components come first, and then each other section in name order. */
export function sectionsOf(pages: readonly PageLink[]): { section: string; links: PageLink[] }[] {
	return [...new Set(pages.map((page) => page.category))]
		.toSorted((a, b) => (a === 'components' ? -1 : b === 'components' ? 1 : a.localeCompare(b)))
		.map((section) => ({ section, links: pages.filter((page) => page.category === section) }))
}

// The search lists each match, as the site has about a hundred pages.
function SearchResults({ pages }: { pages: readonly PageLink[] }) {
	const query = useComboboxDeferredQuery().toLowerCase()

	return pages
		.filter((page) => page.name.toLowerCase().includes(query))
		.map((page) => (
			<ComboboxOption key={page.path} value={page.path}>
				{page.name}
			</ComboboxOption>
		))
}

// A navigation changes `current` for two items only, so each item memoizes.
const PageItem = memo(function PageItem({ page, current }: { page: PageLink; current: boolean }) {
	return (
		<SidebarItem href={page.path} current={current}>
			<SidebarLabel>{page.name}</SidebarLabel>
		</SidebarItem>
	)
})

/**
 * The sidebar of the docs: the search, the sort order, and the pages of each
 * section. A pick in the search goes to its page, as a click on its item does.
 */
export function DocsSidebar({
	pages,
	current,
}: {
	pages: readonly PageLink[]
	current: string | undefined
}) {
	const id = useId()

	const offcanvas = use(OffcanvasContext)

	const navigate = useNavigate()

	const scrollWithin = useScrollWithin()

	const [descending, setDescending] = useState(false)

	const sorted = descending ? pages.toReversed() : pages

	return (
		<Sidebar>
			<SidebarHeader>
				<Heading level={2}>Docs</Heading>
			</SidebarHeader>
			<Flex gap="sm">
				<Combobox<string>
					id={`${id}-search`}
					className="flex-1"
					placeholder="Search docs"
					aria-label="Search docs"
					// The search keeps no value: a pick goes to its page.
					value=""
					onValueChange={(path) => {
						if (!path) return

						navigate(path)

						const item = document.querySelector<HTMLElement>(
							`[data-slot="sidebar"] [href="${CSS.escape(path)}"]`,
						)

						if (item) scrollWithin(item, { block: 'center', behavior: 'smooth' })

						offcanvas?.close()
					}}
				>
					<SearchResults pages={pages} />
				</Combobox>
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
				{sectionsOf(sorted).map(({ section, links }) => (
					<SidebarSection key={section}>
						<Text
							tone="muted"
							className="density-px-ring-[1.5,2,2.5] mb-2 text-sm uppercase tracking-wide"
						>
							{section}
						</Text>
						<SidebarList aria-label={section}>
							{links.map((page) => (
								<PageItem key={page.path} page={page} current={page.path === current} />
							))}
						</SidebarList>
					</SidebarSection>
				))}
			</SidebarBody>
		</Sidebar>
	)
}
