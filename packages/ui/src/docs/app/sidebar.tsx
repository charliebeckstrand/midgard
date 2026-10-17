import { memo, type PointerEvent, type RefObject, useRef } from 'react'
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
import { SearchButton } from './search.tsx'

/** The pages of each section, in the order of `pages`, which the plugin gives by section and then by name. */
export function sectionsOf(pages: readonly PageLink[]): { section: string; links: PageLink[] }[] {
	return [...new Set(pages.map((page) => page.category))].map((section) => ({
		section,
		links: pages.filter((page) => page.category === section),
	}))
}

/** The first page for each initial letter, in the order of `pages`. */
function lettersOf(pages: readonly PageLink[]): { letter: string; path: string }[] {
	const first = new Map<string, string>()

	for (const page of pages) {
		const letter = page.name.charAt(0).toUpperCase()

		if (!first.has(letter)) first.set(letter, page.path)
	}

	return [...first]
		.map(([letter, path]) => ({ letter, path }))
		.sort((a, b) => a.letter.localeCompare(b.letter))
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
 * The letter rail at the side of the body. A press on a letter scrolls the body
 * to the first page with that letter, and a drag along the rail follows the
 * pointer from letter to letter.
 *
 * The rail is for a pointer only. A keyboard and a screen reader get to a page
 * with the search and the arrow keys of the sidebar, so the rail is hidden from
 * the accessibility tree and its letters are not in the Tab order.
 */
function LetterRail({
	pages,
	bodyRef,
}: {
	pages: readonly PageLink[]
	bodyRef: RefObject<HTMLDivElement | null>
}) {
	const last = useRef<string | undefined>(undefined)

	const jumpTo = (event: PointerEvent<HTMLDivElement>) => {
		const target = document
			.elementFromPoint(event.clientX, event.clientY)
			?.closest<HTMLElement>('[data-path]')

		const path = target?.dataset.path

		const body = bodyRef.current

		if (!path || !body || path === last.current) return

		last.current = path

		const item = body
			.querySelector(`[href="${CSS.escape(path)}"]`)
			?.closest('[data-slot="sidebar-item"]')

		if (!item) return

		body.scrollTop += item.getBoundingClientRect().top - body.getBoundingClientRect().top
	}

	return (
		<div
			aria-hidden
			className="flex touch-none select-none flex-col justify-center"
			onPointerDown={(event) => {
				last.current = undefined

				jumpTo(event)
			}}
			// A touch captures to the rail by itself. A mouse follows while it is on the rail and a button is down.
			onPointerMove={(event) => {
				if (event.buttons !== 0) jumpTo(event)
			}}
		>
			{lettersOf(pages).map(({ letter, path }) => (
				<span
					key={letter}
					data-path={path}
					className="cursor-pointer px-1.5 text-center font-medium text-xs/5 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
				>
					{letter}
				</span>
			))}
		</div>
	)
}

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
