import MiniSearch from 'minisearch'
import type { SearchEntry } from '../types.ts'
import { FIELD_BOOST, KIND_BOOST, type SearchField } from './config.ts'
import { rank } from './rank.ts'
import { processTerm, tokenizeQuery, tokenizeText } from './tokenize.ts'

export { normalize } from './tokenize.ts'

// The engine of the search: pure code, with no React and no DOM. MiniSearch
// holds the index. This module sets how the index reads an entry and how it
// orders the results. Each part of the shell that searches calls `search` of
// an index, and no part reads MiniSearch itself.

/**
 * An entry, with its common name when it has one, such as "Selector de fecha"
 * for the DatePicker page, and the place of the entry as the reader sees it,
 * such as "Grid › Ordenación".
 */
export type Matchable = SearchEntry & { alias?: string; place?: string }

/** An index of the entries of the search. */
export type SearchIndex<T extends Matchable> = {
	/**
	 * The entries that match `query`, best first. Each word of the query must
	 * start a word of the entry, or a part of a camelCase word. An empty query
	 * gives no entry.
	 */
	search: (query: string) => T[]
}

const FIELDS = Object.keys(FIELD_BOOST) as SearchField[]

/** Makes the index of `entries`. */
export function createSearchIndex<T extends Matchable>(entries: readonly T[]): SearchIndex<T> {
	const index = new MiniSearch<{ id: number; entry: T }>({
		fields: FIELDS,
		extractField: ({ id, entry }, field) =>
			field === 'id' ? id : (entry[field as SearchField] ?? undefined),
		stringifyField: (value) => (Array.isArray(value) ? value.join(' ') : String(value)),
		tokenize: tokenizeText,
		processTerm,
		searchOptions: {
			tokenize: tokenizeQuery,
			processTerm,
			prefix: true,
			combineWith: 'AND',
			boost: FIELD_BOOST,
			boostDocument: (id: number) => KIND_BOOST[entries[id]?.kind ?? 'prop'],
		},
	})

	index.addAll(entries.map((entry, id) => ({ id, entry })))

	return {
		search: (query) =>
			rank(
				index.search(query).flatMap((result) => {
					const entry = entries[result.id as number]

					return entry ? [entry] : []
				}),
				query,
			),
	}
}
