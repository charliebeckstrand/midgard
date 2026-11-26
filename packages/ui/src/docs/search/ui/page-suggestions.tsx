import pages from 'virtual:docs/pages'
import entries from 'virtual:docs/search'
import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { defineMessages, IntlMessage, useIntl } from 'ui/primitives/intl'
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
		defaultMessage: 'Pages that the address can name',
		description:
			'The name of the list of pages of the docs that a path with no page most likely names. A screen reader reads it.',
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

/** The pages that the path most likely names, and a button that opens the search with its words. */
export function PageSuggestions({ path }: { path: string }) {
	const intl = useIntl()

	const { request } = useSearch()

	const shown = useMemo(
		() => new Map(PLACES.map((entry) => [entry.href, localizeEntry<Matchable>(intl, entry)])),
		[intl],
	)

	const index = useMemo(() => createSearchIndex([...shown.values()]), [shown])

	const suggestions = useMemo(
		() => findSuggestions(index, path).flatMap((href) => shown.get(href) ?? []),
		[index, path, shown],
	)

	return (
		<>
			{suggestions.length > 0 && (
				<List
					variant="plain"
					className="w-full max-w-md"
					items={suggestions}
					getKey={(entry) => entry.href}
					aria-label={intl.formatMessage(messages.suggestions)}
				>
					{(entry) => (
						<ListItem href={entry.href} rounded prefix={<ResultIcon option={entry} />}>
							<ListLabel>
								<bdi>{entry.label}</bdi>
							</ListLabel>
							<ListDescription>
								<ResultSubtitle option={entry} />
							</ListDescription>
						</ListItem>
					)}
				</List>
			)}
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
