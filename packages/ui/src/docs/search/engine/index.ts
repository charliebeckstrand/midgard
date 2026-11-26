import MiniSearch from 'minisearch'
import type { SearchEntry } from '../types.ts'
import { FIELD_BOOST, KIND_BOOST, type SearchField, TYPO } from './config.ts'
import { rank } from './rank.ts'
import { processTerm, tokenizeQuery, tokenizeText } from './tokenize.ts'

export { findMember } from './member.ts'
export { toPathQuery } from './path-query.ts'
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

/** How a search treats the words of a query. */
export type SearchOptions = {
	/**
	 * `all` finds an entry that each word of the query matches. `any` finds an
	 * entry that one word matches, such as for the words of a path that has no
	 * page, where a wrong word must not hide the page.
	 * @defaultValue 'all'
	 */
	match?: 'all' | 'any'
}

/** An index of the entries of the search. */
export type SearchIndex<T extends Matchable> = {
	/**
	 * The entries that match `query`, best first. A word of the query matches
	 * when it starts a word of the entry, or a part of a camelCase word. When no
	 * entry matches, a word of the query can have one letter wrong (`TYPO` in
	 * `config.ts`), so `buton` finds Button. An empty query gives no entry.
	 */
	search: (query: string, options?: SearchOptions) => T[]
}

const FIELDS = Object.keys(FIELD_BOOST) as SearchField[]

/** The count of edits that a correction of `term` can make, or `false` for a short word. */
function correct(term: string): number | false {
	return term.length >= TYPO.minLength ? TYPO.edits : false
}

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
			boostDocument: (id: number) => KIND_BOOST[entries[id]?.kind ?? 'component'],
		},
	})

	index.addAll(entries.map((entry, id) => ({ id, entry })))

	return {
		search: (query, { match = 'all' } = {}) => {
			const combineWith = match === 'all' ? 'AND' : 'OR'

			const found = index.search(query, { combineWith })

			const results =
				found.length > 0 ? found : index.search(query, { combineWith, fuzzy: correct })

			return rank(
				results.flatMap((result) => {
					const entry = entries[result.id as number]

					return entry ? [entry] : []
				}),
				query,
			)
		},
	}
}
