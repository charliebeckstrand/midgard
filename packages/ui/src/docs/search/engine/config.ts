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

/**
 * The count of letters that a correction can add, remove, or change, by the
 * shortest word that takes it. A word of 4 letters or more takes one edit. A
 * word of 6 letters or more takes two, so two letters in the wrong order, as
 * in `dialgo`, find Dialog. A shorter word, such as `tab`, is near too many
 * other words. The search corrects only a query with no match, so a correct
 * word does not also find similar words.
 */
export const TYPO: readonly { minLength: number; edits: number }[] = [
	{ minLength: 6, edits: 2 },
	{ minLength: 4, edits: 1 },
]
