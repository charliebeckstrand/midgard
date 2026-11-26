import { type Matchable, matchEntries } from './match.ts'

// The engine of the search: pure code, with no React and no DOM. Each part of
// the shell that searches calls `search` of an index, and no part imports the
// match rules itself.

export type { Matchable } from './match.ts'

/** An index of the entries of the search. */
export type SearchIndex<T extends Matchable> = {
	/** The entries that match `query`, best first. An empty query gives no entry. */
	search: (query: string) => T[]
}

/** Makes the index of `entries`. */
export function createSearchIndex<T extends Matchable>(entries: readonly T[]): SearchIndex<T> {
	return { search: (query) => matchEntries(entries, query) }
}
