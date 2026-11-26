import type { SearchKind } from '../types.ts'

// The weights of the search. A change here changes the order of the results,
// so update `search-engine.test.ts` with it.

/** The fields of an entry that the engine reads. */
export type SearchField = 'label' | 'alias' | 'keywords' | 'members' | 'context' | 'place'

/**
 * The weight of a match in each field. The name of an entry counts most, then
 * its common name, then its keywords, then the names of its props and events.
 * A match in the place of an entry counts least.
 */
export const FIELD_BOOST: Readonly<Record<SearchField, number>> = {
	label: 10,
	alias: 8,
	keywords: 5,
	members: 2,
	context: 1,
	place: 1,
}

/**
 * The weight of each kind. When two entries match equally well, the one that
 * the reader more often wants goes first: a page before its tab or its API
 * reference.
 */
export const KIND_BOOST: Readonly<Record<SearchKind, number>> = {
	page: 3,
	tab: 2,
	component: 2,
}
