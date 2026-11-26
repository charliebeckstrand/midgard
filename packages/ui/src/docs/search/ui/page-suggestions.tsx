import pages from 'virtual:docs/pages'
import entries from 'virtual:docs/search'
import { Search } from 'lucide-react'
import { useId, useMemo } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { defineMessages, IntlMessage, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { sectionLabel } from '../../app/app-messages.ts'
import {
	createSearchIndex,
	type Matchable,
	type SearchIndex,
	toPathQueries,
} from '../engine/index.ts'
import { useSearch } from './context.ts'
import { localizeEntry } from './localize.ts'
import { ResultIcon, ResultSubtitle } from './search-result.tsx'

// The help of the not-found page: the pages that the path most likely names,
// in the rows of the search, and a button that opens the search with the
// words of the path.

const messages = defineMessages({
	suggestions: {
		id: 'docs.notFound.suggestions',
		defaultMessage: 'Did you mean?',
		description:
			'The text above the lists of pages of the docs that a path with no page most likely names. Each list is under the name of its section.',
	},
	search: {
		id: 'docs.notFound.search',
		defaultMessage: 'Search the docs',
		description:
			'The label of the button on the not-found page that opens the search with the words of the path.',
	},
})

/** The most suggestions that the page shows. */
const LIMIT = 3

/** The folder of each section of the docs, such as `modules`. */
const SECTIONS: ReadonlySet<string> = new Set(pages.map((page) => page.category))

/** The pages and the tabs: the entries that the not-found page can suggest. */
const PLACES = entries.filter((entry) => entry.kind === 'page' || entry.kind === 'tab')

/**
 * The paths that `path` most likely names, best first: the page whose path
 * starts `path`, as Grid for `/modules/grid/nope`, then the best match of each
 * part of the path in turn, as Button for `/components/button`, and Dialog and
 * Input for `/dialug/input`, then the pages of a section for the path of the
 * section, as `/modules`. Each part searches alone, so a wrong part does not
 * hide the page that another part names.
 */
function findSuggestions(index: SearchIndex<Matchable>, path: string): string[] {
	const lower = path.toLowerCase()

	const parts = lower.split('/').filter(Boolean)

	const prefix = pages
		.filter((page) => lower.startsWith(`${page.path}/`))
		.toSorted((a, b) => b.path.length - a.path.length)
		.map((page) => page.path)

	const matches = toPathQueries(lower, SECTIONS).map((query) =>
		index.search(query).map((entry) => entry.href),
	)

	// The first match of each part, then the second of each part, and so on.
	const found = Array.from({ length: LIMIT }, (_, rank) =>
		matches.flatMap((hrefs) => hrefs[rank] ?? []),
	).flat()

	const section =
		parts.length === 1
			? pages.filter((page) => page.category === parts[0]).map((page) => page.path)
			: []

	return [...new Set([...prefix, ...found, ...section])].slice(0, LIMIT)
}

/** The section of the page of a path, such as `modules` for `/modules/grid/sorting`. */
function findSection(href: string): string {
	const page = pages.find((link) => href === link.path || href.startsWith(`${link.path}/`))

	return page?.category ?? ''
}

/**
 * The suggestions in groups by section. The groups go in the order of their
 * best suggestion, and each group keeps the order of its suggestions.
 */
function groupBySection(entries: readonly Matchable[]) {
	const groups = new Map<string, Matchable[]>()

	for (const entry of entries) {
		const section = findSection(entry.href)

		groups.set(section, [...(groups.get(section) ?? []), entry])
	}

	return [...groups].map(([section, group]) => ({ section, entries: group }))
}

/**
 * The suggestions of one section, under the name of the section. The name
 * shows only when the suggestions are in more than one section. Without it, the
 * element at `labelledBy` names the list. A page shows no line below its name,
 * because the section is its place. A tab shows its page.
 */
function SectionSuggestions({
	section,
	entries: group,
	labelledBy,
}: {
	section: string
	entries: readonly Matchable[]
	/** The id of the element that names the list, or `undefined` to show the name of the section. */
	labelledBy: string | undefined
}) {
	const intl = useIntl()

	const headingId = useId()

	return (
		<Stack gap="md" className="w-full max-w-md">
			{labelledBy === undefined && (
				<Text id={headingId} className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
					{sectionLabel(intl, section)}
				</Text>
			)}
			<List
				variant="plain"
				items={group}
				getKey={(entry) => entry.href}
				aria-labelledby={labelledBy ?? headingId}
			>
				{(entry) => (
					<ListItem href={entry.href} rounded prefix={<ResultIcon option={entry} />}>
						<ListLabel>
							<bdi>{entry.label}</bdi>
						</ListLabel>
						{entry.kind !== 'page' && (
							<ListDescription>
								<ResultSubtitle option={entry} />
							</ListDescription>
						)}
					</ListItem>
				)}
			</List>
		</Stack>
	)
}

/** The pages that the path most likely names, and a button that opens the search with its words. */
export function PageSuggestions({ path }: { path: string }) {
	const intl = useIntl()

	const { request } = useSearch()

	const introId = useId()

	const shown = useMemo(
		() => new Map(PLACES.map((entry) => [entry.href, localizeEntry<Matchable>(intl, entry)])),
		[intl],
	)

	const index = useMemo(() => createSearchIndex([...shown.values()]), [shown])

	const groups = useMemo(
		() => groupBySection(findSuggestions(index, path).flatMap((href) => shown.get(href) ?? [])),
		[index, path, shown],
	)

	return (
		<>
			{groups.length > 0 && (
				<Text id={introId}>
					<IntlMessage message={messages.suggestions} />
				</Text>
			)}
			{groups.map(({ section, entries: group }) => (
				<SectionSuggestions
					key={section}
					section={section}
					entries={group}
					labelledBy={groups.length === 1 ? introId : undefined}
				/>
			))}
			<div>
				<Button
					variant="plain"
					onClick={() => request({ query: toPathQueries(path, SECTIONS).join(' ') })}
				>
					<Icon icon={<Search />} />
					<IntlMessage message={messages.search} />
				</Button>
			</div>
		</>
	)
}
