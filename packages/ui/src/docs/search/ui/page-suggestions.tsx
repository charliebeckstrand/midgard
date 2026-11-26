import pages from 'virtual:docs/pages'
import entries from 'virtual:docs/search'
import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Link } from 'ui/link'
import { defineMessages, IntlMessage, useIntl } from 'ui/primitives/intl'
import { Text } from 'ui/text'
import {
	createSearchIndex,
	type Matchable,
	type SearchIndex,
	toPathQuery,
} from '../engine/index.ts'
import { useSearch } from './context.ts'
import { localizeEntry } from './localize.ts'

// The help of the not-found page: the pages that the path most likely names,
// and a button that opens the search with the words of the path.

const messages = defineMessages({
	suggestions: {
		id: 'docs.notFound.suggestions',
		defaultMessage: 'Did you mean:',
		description:
			'The text before a list of pages of the docs that a path with no page most likely names.',
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
 * starts `path`, as Grid for `/modules/grid/nope`, then the pages and the tabs
 * that a word of the path finds, as Button for `/components/button` and Dialog
 * for `/dialug`, then the pages of a section for the path of the section, as
 * `/modules`.
 */
function findSuggestions(index: SearchIndex<Matchable>, path: string): string[] {
	const lower = path.toLowerCase()

	const parts = lower.split('/').filter(Boolean)

	const prefix = pages
		.filter((page) => lower.startsWith(`${page.path}/`))
		.toSorted((a, b) => b.path.length - a.path.length)
		.map((page) => page.path)

	const found = index
		.search(toPathQuery(lower, SECTIONS), { match: 'any' })
		.map((entry) => entry.href)

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
				<>
					<Text>
						<IntlMessage message={messages.suggestions} />
					</Text>
					<ul className="list-disc ps-6">
						{suggestions.map((entry) => (
							<li key={entry.href}>
								<Text>
									<Link href={entry.href} underline>
										{entry.label}
									</Link>{' '}
									<span className="text-zinc-600 dark:text-zinc-400">{entry.place}</span>
								</Text>
							</li>
						))}
					</ul>
				</>
			)}
			<div>
				<Button variant="outline" onClick={() => request({ query: toPathQuery(path, SECTIONS) })}>
					<Icon icon={<Search />} />
					<IntlMessage message={messages.search} />
				</Button>
			</div>
		</>
	)
}
