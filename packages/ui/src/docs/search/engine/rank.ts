import { KIND_BOOST } from './config.ts'
import type { Matchable } from './index.ts'
import { normalize } from './tokenize.ts'

// The order of the results. MiniSearch gives each result a score from the
// fields and the kinds of `config.ts`. One rule then goes before the score.

/** The names of `entry` that a query can be equal to: its label, its common name, and its keywords. */
function getNames(entry: Matchable): string[] {
	return [entry.label, entry.alias ?? '', ...(entry.keywords ?? [])].map(normalize)
}

/**
 * The results with each entry whose name is the query first, in the order of
 * the weights of their kinds: `button` puts the Button page and `<Button />`
 * before CopyButton, and `modal` puts each page with the keyword before each
 * component with a `modal` prop. Each other entry keeps the order of its score.
 */
export function rank<T extends Matchable>(results: readonly T[], query: string): T[] {
	const text = normalize(query)

	const exact = (entry: T) => getNames(entry).includes(text)

	return [
		...results.filter(exact).toSorted((a, b) => KIND_BOOST[b.kind] - KIND_BOOST[a.kind]),
		...results.filter((entry) => !exact(entry)),
	]
}
