import { KIND_BOOST } from './config.ts'
import type { Matchable } from './index.ts'
import { normalize } from './tokenize.ts'

// The order of the results. MiniSearch gives each result a score from the
// fields and the kinds of `config.ts`. Two rules then go before the score.

/** One result of MiniSearch: the entry, and the terms of the entry that matched, with their fields. */
export type RankInput<T extends Matchable> = {
	entry: T
	/** Each term of the entry that matched, and the fields that hold it. */
	match: Readonly<Record<string, readonly string[]>>
}

/** The names of `entry` that a query can be equal to: its label, its common name, and its keywords. */
function getNames(entry: Matchable): string[] {
	return [entry.label, entry.alias ?? '', ...(entry.keywords ?? [])].map(normalize)
}

/**
 * The tier of a result: 0 when a name of the entry is the query, 1 when each
 * word of the query matches the entry outside its props and events, 2 for any
 * other match.
 *
 * In a search with one letter corrected (`TYPO` in `config.ts`), the query is
 * the terms that the entry matched: `buton` matched `button`, so the Button
 * page is in tier 0, and IconButton is not.
 */
function getTier<T extends Matchable>(
	{ entry, match }: RankInput<T>,
	words: readonly string[],
	corrected: boolean,
): number {
	const terms = Object.keys(match)

	const query = corrected ? terms.join(' ') : words.join(' ')

	if (getNames(entry).includes(query)) return 0

	// With no correction, a term matches a word when it starts with the word.
	const named = words.every((word) =>
		terms.some(
			(term) =>
				(corrected || term.startsWith(word)) && match[term]?.some((field) => field !== 'members'),
		),
	)

	return named ? 1 : 2
}

/**
 * The results in tiers ({@link getTier}). `button` puts the Button page and
 * `<Button />` before CopyButton, `modal` puts each page with the keyword
 * before each component with a `modal` prop, and `grid sort` puts the Sorting
 * tab of Grid before `<Grid />`, which matches `sort` only by its props. In
 * tier 0, the weights of the kinds give the order. In each other tier, the
 * results keep the order of their score.
 */
export function rank<T extends Matchable>(
	results: readonly RankInput<T>[],
	query: string,
	corrected: boolean,
): T[] {
	const words = normalize(query).split(' ').filter(Boolean)

	const tiers: T[][] = [[], [], []]

	for (const result of results) tiers[getTier(result, words, corrected)]?.push(result.entry)

	const [exact = [], named = [], other = []] = tiers

	return [...exact.toSorted((a, b) => KIND_BOOST[b.kind] - KIND_BOOST[a.kind]), ...named, ...other]
}
